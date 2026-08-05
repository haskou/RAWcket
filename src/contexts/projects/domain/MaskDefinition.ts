import { AdjustmentKey, type AdjustmentKeyPrimitive } from './value-objects/AdjustmentKey';
import { GlobalAdjustmentValue } from './value-objects/GlobalAdjustmentValue';
import { MaskId } from './value-objects/MaskId';
import type { SemanticMaskCategoryPrimitive } from './value-objects/SemanticMaskCategory';

type PointPrimitive = { x: number; y: number };
type BrushPointPrimitive = PointPrimitive & { pressure?: number };
type RectanglePrimitive = PointPrimitive & { width: number; height: number };

export type BrushMaskShape = {
  kind: 'brush';
  strokes: Array<{ points: BrushPointPrimitive[]; size: number; hardness: number; flow: number; mode?: 'add' | 'erase' }>;
};
export type LinearGradientMaskShape = { kind: 'linear-gradient'; start: PointPrimitive; end: PointPrimitive };
export type RadialMaskShape = {
  kind: 'radial';
  center: PointPrimitive;
  radiusX: number;
  radiusY: number;
  rotationDegrees: number;
};
export type LuminanceRangeMaskShape = { kind: 'luminance-range'; minimum: number; maximum: number };
export type ColorRangeMaskShape = { kind: 'color-range'; samples: PointPrimitive[]; tolerance: number };
export type AiSegmentationMaskShape = {
  kind: 'ai-segmentation';
  prompt: string;
  positivePoints: PointPrimitive[];
  negativePoints: PointPrimitive[];
  boundingBoxes: RectanglePrimitive[];
  strategy: string;
  version: string;
  semanticCategory?: SemanticMaskCategoryPrimitive | null;
  confidence?: number | null;
  rasterCacheKey: string | null;
};
export type CompositeMaskShape = {
  kind: 'composite';
  operation: 'add' | 'subtract' | 'intersect';
  children: MaskDefinitionPrimitives[];
};
export type MaskShape =
  | BrushMaskShape
  | LinearGradientMaskShape
  | RadialMaskShape
  | LuminanceRangeMaskShape
  | ColorRangeMaskShape
  | AiSegmentationMaskShape
  | CompositeMaskShape;

export type MaskDefinitionPrimitives = {
  id: string;
  enabled: boolean;
  inverted: boolean;
  opacity: number;
  feather: number;
  density: number;
  expansion?: number;
  localAdjustments: Partial<Record<AdjustmentKeyPrimitive, number>>;
  shape: MaskShape;
};

export class MaskDefinition {
  private constructor(
    private readonly id: MaskId,
    private readonly primitives: Omit<MaskDefinitionPrimitives, 'id'>
  ) {
    MaskDefinition.ensureUnitInterval(primitives.opacity, 'opacity');
    MaskDefinition.ensureUnitInterval(primitives.feather, 'feather');
    MaskDefinition.ensureUnitInterval(primitives.density, 'density');
    if (!Number.isFinite(primitives.expansion) || (primitives.expansion ?? 0) < -0.25 || (primitives.expansion ?? 0) > 0.25) {
      throw new Error('Mask expansion must be between -0.25 and 0.25.');
    }
    this.ensureLocalAdjustments(primitives.localAdjustments);
    this.ensureShape(primitives.shape);
  }

  public static fromPrimitives(input: MaskDefinitionPrimitives): MaskDefinition {
    return new MaskDefinition(new MaskId(input.id), structuredClone({
      enabled: input.enabled,
      inverted: input.inverted,
      opacity: input.opacity,
      feather: input.feather,
      density: input.density,
      expansion: input.expansion ?? 0,
      localAdjustments: input.localAdjustments,
      shape: MaskDefinition.normalizeShape(input.shape)
    }));
  }

  public isIdentifiedBy(id: MaskId): boolean {
    return this.id.isEqual(id);
  }

  public getId(): MaskId {
    return this.id;
  }

  public toPrimitives(): MaskDefinitionPrimitives {
    return structuredClone({ id: this.id.valueOf(), ...this.primitives });
  }

  private static ensureUnitInterval(value: number, label: string): void {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Mask ${label} must be between 0 and 1.`);
    }
  }

  private ensureLocalAdjustments(adjustments: Partial<Record<AdjustmentKeyPrimitive, number>>): void {
    for (const [key, value] of Object.entries(adjustments)) {
      const adjustmentKey = AdjustmentKey.fromString(key);
      GlobalAdjustmentValue.for(adjustmentKey, value);
    }
  }

  private ensureShape(shape: MaskShape): void {
    const points: PointPrimitive[] = [];
    const boxes: RectanglePrimitive[] = [];
    if (shape.kind === 'brush') {
      points.push(...shape.strokes.flatMap((stroke) => stroke.points));
      shape.strokes.forEach((stroke) => {
        if (!Number.isFinite(stroke.size) || stroke.size <= 0 || stroke.size > 1) throw new Error('Brush size must be between 0 and 1.');
        MaskDefinition.ensureUnitInterval(stroke.hardness, 'brush hardness');
        MaskDefinition.ensureUnitInterval(stroke.flow, 'brush flow');
        stroke.points.forEach((point) => MaskDefinition.ensureUnitInterval(point.pressure ?? 1, 'brush pressure'));
      });
    }
    if (shape.kind === 'linear-gradient') points.push(shape.start, shape.end);
    if (shape.kind === 'radial') points.push(shape.center);
    if (shape.kind === 'color-range') {
      points.push(...shape.samples);
      if (shape.samples.length === 0) throw new Error('A color range needs at least one sample.');
      MaskDefinition.ensureUnitInterval(shape.tolerance, 'color tolerance');
    }
    if (shape.kind === 'ai-segmentation') {
      points.push(...shape.positivePoints, ...shape.negativePoints);
      boxes.push(...shape.boundingBoxes);
      if (shape.prompt.trim().length === 0 || shape.strategy.trim().length === 0 || shape.version.trim().length === 0) {
        throw new Error('An AI mask must preserve its prompt, strategy, and version.');
      }
      if (shape.semanticCategory?.trim().length === 0) {
        throw new Error('A semantic mask category cannot be empty.');
      }
      if (shape.confidence !== undefined && shape.confidence !== null) {
        MaskDefinition.ensureUnitInterval(shape.confidence, 'confidence');
      }
    }
    points.forEach((point) => this.ensurePoint(point));
    boxes.forEach((box) => {
      this.ensurePoint(box);
      MaskDefinition.ensureUnitInterval(box.width, 'width');
      MaskDefinition.ensureUnitInterval(box.height, 'height');
      if (box.x + box.width > 1 || box.y + box.height > 1) {
        throw new Error('Mask boxes must remain inside the image.');
      }
    });
    if (shape.kind === 'luminance-range' && (shape.minimum < 0 || shape.maximum > 1 || shape.minimum > shape.maximum)) {
      throw new Error('The luminance range is invalid.');
    }
    if (shape.kind === 'composite') {
      if (shape.children.length < 2) throw new Error('A composite mask needs at least two masks.');
      shape.children.forEach((child) => MaskDefinition.fromPrimitives(child));
    }
  }

  private ensurePoint(point: PointPrimitive): void {
    MaskDefinition.ensureUnitInterval(point.x, 'x coordinate');
    MaskDefinition.ensureUnitInterval(point.y, 'y coordinate');
  }

  private static normalizeShape(shape: MaskShape): MaskShape {
    if (shape.kind === 'brush') {
      return {
        ...structuredClone(shape),
        strokes: shape.strokes.map((stroke) => ({
          ...structuredClone(stroke),
          mode: stroke.mode ?? 'add',
          points: stroke.points.map((point) => ({ ...point, pressure: point.pressure ?? 1 }))
        }))
      };
    }
    if (shape.kind === 'composite') {
      return { ...structuredClone(shape), children: shape.children.map((child) => MaskDefinition.fromPrimitives(child).toPrimitives()) };
    }
    return structuredClone(shape);
  }
}
