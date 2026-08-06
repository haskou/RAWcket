import { MaskDefinition, type MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import { CurveSet } from '@/contexts/projects/domain/ToneCurve';
import { maskSchema } from '@/contexts/projects/infrastructure/serialization/ProjectSchemas';

function semanticMask(): MaskDefinitionPrimitives {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    inverted: false,
    opacity: 1,
    feather: 0.2,
    density: 1,
    localAdjustments: { exposure: 0.5 },
    shape: {
      kind: 'ai-segmentation',
      prompt: 'Select sky',
      positivePoints: [{ x: 0.5, y: 0.2 }],
      negativePoints: [],
      boundingBoxes: [{ x: 0, y: 0, width: 1, height: 0.5 }],
      strategy: 'local/model',
      version: 'pinned-revision',
      semanticCategory: 'sky',
      confidence: 0.86,
      rasterCacheKey: null
    }
  };
}

describe('MaskDefinition', () => {
  it('preserves semantic provenance and confidence as recipe data', () => {
    const primitives = semanticMask();
    const parsed = maskSchema.parse(primitives);
    const mask = MaskDefinition.fromPrimitives(parsed);

    expect(mask.toPrimitives()).toEqual({ ...primitives, expansion: 0, localCurves: CurveSet.identity().toPrimitives() });
  });

  it('validates and preserves editable local channel curves', () => {
    const primitives = semanticMask();
    primitives.localCurves = {
      ...CurveSet.identity().toPrimitives(),
      rgb: { points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.7 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' }
    };

    expect(MaskDefinition.fromPrimitives(primitives).toPrimitives().localCurves).toEqual(primitives.localCurves);
    primitives.localCurves.rgb.points[1] = { x: 1.2, y: 0.5 };
    expect(() => MaskDefinition.fromPrimitives(primitives)).toThrow(/between 0 and 1/);
  });

  it('normalizes legacy brush strokes to additive full-pressure recipe data', () => {
    const legacy: MaskDefinitionPrimitives = {
      id: crypto.randomUUID(), enabled: true, inverted: false, opacity: 1, feather: 0, density: 1,
      localAdjustments: {}, shape: { kind: 'brush', strokes: [{ points: [{ x: 0.5, y: 0.5 }], size: 0.1, hardness: 1, flow: 1 }] }
    };

    expect(MaskDefinition.fromPrimitives(legacy).toPrimitives()).toMatchObject({
      expansion: 0,
      shape: { kind: 'brush', strokes: [{ mode: 'add', points: [{ pressure: 1 }] }] }
    });
  });

  it('rejects semantic confidence outside the unit interval', () => {
    const primitives = semanticMask();
    if (primitives.shape.kind !== 'ai-segmentation') throw new Error('The test fixture must be semantic.');
    primitives.shape.confidence = 1.1;

    expect(() => MaskDefinition.fromPrimitives(primitives)).toThrow(/confidence must be between 0 and 1/);
    expect(() => maskSchema.parse(primitives)).toThrow();
  });

  it('requires a bounded tolerance and at least one source point for color sampling', () => {
    const primitives: MaskDefinitionPrimitives = {
      id: crypto.randomUUID(), enabled: true, inverted: false, opacity: 1, feather: 0, density: 1,
      localAdjustments: {}, shape: { kind: 'color-range', samples: [], tolerance: 0.2 }
    };

    expect(() => MaskDefinition.fromPrimitives(primitives)).toThrow(/at least one sample/);
    expect(() => maskSchema.parse(primitives)).toThrow();
    primitives.shape = { kind: 'color-range', samples: [{ x: 0.5, y: 0.5 }], tolerance: 1.1 };
    expect(() => MaskDefinition.fromPrimitives(primitives)).toThrow(/color tolerance must be between 0 and 1/);
  });
});
