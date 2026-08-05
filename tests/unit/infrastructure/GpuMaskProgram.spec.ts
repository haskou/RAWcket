import type { MaskDefinitionPrimitives, MaskShape } from '@/contexts/projects/domain/MaskDefinition';
import { GPU_MASK_NODE, GpuMaskProgramEncoder } from '@/contexts/projects/infrastructure/renderers/GpuMaskProgram';

function mask(id: number, shape: MaskShape): MaskDefinitionPrimitives {
  return {
    id: `00000000-0000-4000-8000-${id.toString().padStart(12, '0')}`,
    enabled: true,
    inverted: false,
    opacity: 1,
    feather: 0,
    density: 1,
    expansion: 0,
    localAdjustments: {},
    shape
  };
}

describe('GpuMaskProgramEncoder', () => {
  it('encodes every editable mask shape and boolean operation as bounded numeric GPU instructions', () => {
    const smart = mask(7, {
      kind: 'ai-segmentation',
      prompt: 'subject',
      positivePoints: [{ x: 0.4, y: 0.4 }],
      negativePoints: [{ x: 0.9, y: 0.9 }],
      boundingBoxes: [{ x: 0.2, y: 0.2, width: 0.5, height: 0.5 }],
      strategy: 'local-spatial-luminance',
      version: '1',
      rasterCacheKey: null
    });
    const subtract = mask(8, {
      kind: 'composite',
      operation: 'subtract',
      children: [mask(9, { kind: 'radial', center: { x: 0.5, y: 0.5 }, radiusX: 0.4, radiusY: 0.3, rotationDegrees: 10 }), smart]
    });
    const intersect = mask(10, {
      kind: 'composite',
      operation: 'intersect',
      children: [mask(11, { kind: 'luminance-range', minimum: 0.2, maximum: 0.8 }), subtract]
    });
    const recipeMask = mask(12, {
      kind: 'composite',
      operation: 'add',
      children: [
        mask(1, { kind: 'brush', strokes: [{ points: [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.7, pressure: 0.6 }], size: 0.2, hardness: 0.5, flow: 0.8, mode: 'add' }] }),
        mask(2, { kind: 'linear-gradient', start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }),
        mask(3, { kind: 'color-range', samples: [{ x: 0.3, y: 0.4 }], tolerance: 0.2 }),
        intersect
      ]
    });

    const program = new GpuMaskProgramEncoder().encode([recipeMask]);

    expect(program).not.toBeNull();
    if (program === null) throw new Error('Expected a GPU mask program.');
    const kinds = Array.from({ length: program.nodeCount }, (_, index) => program.nodes[index * 12]);
    expect(new Set(kinds)).toEqual(new Set(Object.values(GPU_MASK_NODE)));
    expect(program.outputs[0]).toBe(program.nodeCount - 1);
    expect([...program.nodes, ...program.data].every(Number.isFinite)).toBe(true);
  });

  it('declines programs that exceed the fixed GPU data budget so the caller can use CPU fallback', () => {
    const points = Array.from({ length: 2_050 }, (_, index) => ({
      x: index % 2 === 0 ? 0.25 : 0.75,
      y: index % 3 === 0 ? 0.25 : 0.75,
      pressure: 1
    }));
    const oversized = mask(1, {
      kind: 'brush',
      strokes: [{ points, size: 0.1, hardness: 0.5, flow: 1, mode: 'add' }]
    });

    expect(new GpuMaskProgramEncoder().encode([oversized])).toBeNull();
  });
});
