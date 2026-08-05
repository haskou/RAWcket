import { MaskDefinition, type MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
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

    expect(mask.toPrimitives()).toEqual(primitives);
  });

  it('rejects semantic confidence outside the unit interval', () => {
    const primitives = semanticMask();
    if (primitives.shape.kind !== 'ai-segmentation') throw new Error('The test fixture must be semantic.');
    primitives.shape.confidence = 1.1;

    expect(() => MaskDefinition.fromPrimitives(primitives)).toThrow(/confidence must be between 0 and 1/);
    expect(() => maskSchema.parse(primitives)).toThrow();
  });
});
