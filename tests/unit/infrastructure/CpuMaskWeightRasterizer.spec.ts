import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import { CpuMaskWeightRasterizer } from '@/contexts/projects/infrastructure/renderers/CpuMaskWeightRasterizer';

function mask(shape: MaskDefinitionPrimitives['shape']): MaskDefinitionPrimitives {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    inverted: false,
    opacity: 1,
    feather: 0,
    density: 1,
    localAdjustments: { exposure: 0.5 },
    shape
  };
}

describe('CpuMaskWeightRasterizer', () => {
  it('lays out one complete weight plane per mask in recipe order', () => {
    const source = new Uint8ClampedArray([
      20, 20, 20, 255,
      220, 220, 220, 255
    ]);
    const weights = new CpuMaskWeightRasterizer().rasterize(source, 2, 1, [
      mask({ kind: 'linear-gradient', start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } }),
      mask({ kind: 'luminance-range', minimum: 0.7, maximum: 1 })
    ]);

    expect([...weights]).toEqual([0.25, 0.75, 0, 1]);
  });

  it('samples smart-point luminance from the unchanged source', () => {
    const source = new Uint8ClampedArray([
      32, 32, 32, 255,
      32, 32, 32, 255,
      240, 240, 240, 255
    ]);
    const weights = new CpuMaskWeightRasterizer().rasterize(source, 3, 1, [mask({
      kind: 'ai-segmentation',
      prompt: 'dark subject',
      positivePoints: [{ x: 0.1, y: 0.5 }],
      negativePoints: [],
      boundingBoxes: [],
      strategy: 'local-spatial-luminance',
      version: '1',
      rasterCacheKey: null
    })]);

    expect([...weights]).toEqual([1, 1, 0]);
  });
});
