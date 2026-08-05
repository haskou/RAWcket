import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import { WebGl2MaskWeightRasterizer } from '@/contexts/projects/infrastructure/renderers/WebGl2MaskWeightRasterizer';

describe('WebGl2MaskWeightRasterizer', () => {
  it('returns control to the CPU fallback before allocating textures when more than four mask planes are requested', () => {
    const masks = Array.from({ length: 5 }, (_, index) => radialMask(index));

    const result = new WebGl2MaskWeightRasterizer().rasterize(
      {} as WebGL2RenderingContext,
      {} as WebGLTexture,
      1,
      1,
      masks
    );

    expect(result).toBeNull();
  });
});

function radialMask(index: number): MaskDefinitionPrimitives {
  return {
    id: `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
    enabled: true,
    inverted: false,
    opacity: 1,
    feather: 0,
    density: 1,
    localAdjustments: {},
    shape: { kind: 'radial', center: { x: 0.5, y: 0.5 }, radiusX: 0.2, radiusY: 0.2, rotationDegrees: 0 }
  };
}
