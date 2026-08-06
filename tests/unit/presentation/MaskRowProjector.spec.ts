import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import { projectMaskRow } from '@/presentation/editor/MaskRowProjector';

function semanticMask(confidence: number | null = 0.864): MaskDefinitionPrimitives {
  return {
    id: crypto.randomUUID(), enabled: true, inverted: false, opacity: 1, feather: 0, density: 1,
    localAdjustments: {},
    shape: {
      kind: 'ai-segmentation', prompt: 'Select sky', positivePoints: [], negativePoints: [], boundingBoxes: [],
      strategy: 'segformer', version: 'pinned', semanticCategory: 'sky', confidence, rasterCacheKey: null
    }
  };
}

describe('MaskRowProjector', () => {
  it('presents semantic category and rounded confidence directly on the mask row', () => {
    expect(projectMaskRow(semanticMask(), 2)).toEqual({
      title: 'Smart 3',
      provenance: 'Sky · 86% confidence',
      status: 'On · points + box'
    });
  });

  it('labels absent semantic confidence without fabricating certainty', () => {
    expect(projectMaskRow(semanticMask(null), 0).provenance).toBe('Sky · Confidence unavailable');
  });

  it('keeps manual mask rows compact and reports disabled state', () => {
    const mask: MaskDefinitionPrimitives = {
      id: crypto.randomUUID(), enabled: false, inverted: false, opacity: 1, feather: 0, density: 1,
      localAdjustments: {}, shape: { kind: 'radial', center: { x: 0.5, y: 0.5 }, radiusX: 0.2, radiusY: 0.2, rotationDegrees: 0 }
    };

    expect(projectMaskRow(mask, 0)).toEqual({ title: 'Radial 1', provenance: null, status: 'Off' });
  });
});
