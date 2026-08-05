import { AdjustmentKey, type AdjustmentKeyPrimitive } from './value-objects/AdjustmentKey';
import { GlobalAdjustmentValue } from './value-objects/GlobalAdjustmentValue';
import { MaskId } from './value-objects/MaskId';

type PointPrimitive = { x: number; y: number };
type RectanglePrimitive = PointPrimitive & { width: number; height: number };

export type BrushMaskShape = {
  kind: 'brush';
  strokes: Array<{ points: PointPrimitive[]; size: number; hardness: number; flow: number }>;
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
  localAdjustments: Partial<Record<AdjustmentKeyPrimitive, number>>;
  shape: MaskShape;
};

export class MaskDefinition {
  private constructor(
    private readonly id: MaskId,
    private readonly primitives: Omit<MaskDefinitionPrimitives, 'id'>
  ) {
    MaskDefinition.ensureUnitInterval(primitives.opacity, 'opacidad');
    MaskDefinition.ensureUnitInterval(primitives.feather, 'feather');
    MaskDefinition.ensureUnitInterval(primitives.density, 'densidad');
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
      localAdjustments: input.localAdjustments,
      shape: input.shape
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
      throw new Error(`La ${label} de mascara debe estar entre 0 y 1.`);
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
    if (shape.kind === 'brush') points.push(...shape.strokes.flatMap((stroke) => stroke.points));
    if (shape.kind === 'linear-gradient') points.push(shape.start, shape.end);
    if (shape.kind === 'radial') points.push(shape.center);
    if (shape.kind === 'color-range') points.push(...shape.samples);
    if (shape.kind === 'ai-segmentation') {
      points.push(...shape.positivePoints, ...shape.negativePoints);
      boxes.push(...shape.boundingBoxes);
      if (shape.prompt.trim().length === 0 || shape.strategy.trim().length === 0 || shape.version.trim().length === 0) {
        throw new Error('Una mascara IA debe conservar prompt, estrategia y version.');
      }
    }
    points.forEach((point) => this.ensurePoint(point));
    boxes.forEach((box) => {
      this.ensurePoint(box);
      MaskDefinition.ensureUnitInterval(box.width, 'anchura');
      MaskDefinition.ensureUnitInterval(box.height, 'altura');
      if (box.x + box.width > 1 || box.y + box.height > 1) {
        throw new Error('Las cajas de mascara deben quedar dentro de la imagen.');
      }
    });
    if (shape.kind === 'luminance-range' && (shape.minimum < 0 || shape.maximum > 1 || shape.minimum > shape.maximum)) {
      throw new Error('El rango de luminancia no es valido.');
    }
    if (shape.kind === 'composite') {
      if (shape.children.length < 2) throw new Error('Una mascara compuesta necesita al menos dos mascaras.');
      shape.children.forEach((child) => MaskDefinition.fromPrimitives(child));
    }
  }

  private ensurePoint(point: PointPrimitive): void {
    MaskDefinition.ensureUnitInterval(point.x, 'coordenada x');
    MaskDefinition.ensureUnitInterval(point.y, 'coordenada y');
  }
}
