import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import { WebGpuMaskWeightRasterizer } from '@/contexts/projects/infrastructure/renderers/WebGpuMaskWeightRasterizer';

describe('WebGpuMaskWeightRasterizer', () => {
  it('returns control to the CPU fallback before allocating resources when the numeric mask program is oversized', () => {
    const mask = oversizedBrushMask();

    const result = new WebGpuMaskWeightRasterizer().rasterize(
      {} as GPUDevice,
      {} as GPUCommandEncoder,
      {} as GPUBuffer,
      1,
      1,
      [mask]
    );

    expect(result).toBeNull();
  });
});

function oversizedBrushMask(): MaskDefinitionPrimitives {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    enabled: true,
    inverted: false,
    opacity: 1,
    feather: 0,
    density: 1,
    localAdjustments: {},
    shape: {
      kind: 'brush',
      strokes: [{
        points: Array.from({ length: 2_050 }, (_, index) => ({ x: index % 2, y: index % 3, pressure: 1 })),
        size: 0.1,
        hardness: 0.5,
        flow: 1,
        mode: 'add'
      }]
    }
  };
}
