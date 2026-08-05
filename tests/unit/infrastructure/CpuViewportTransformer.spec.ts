import { ViewportTransform, type ViewportTransformPrimitives } from '@/contexts/projects/domain/ViewportTransform';
import { CpuViewportTransformer } from '@/contexts/projects/infrastructure/renderers/CpuViewportTransformer';

function viewport(overrides: Partial<ViewportTransformPrimitives> = {}): ViewportTransformPrimitives {
  return { ...ViewportTransform.reset().toPrimitives(), ...overrides };
}

describe('CpuViewportTransformer', () => {
  it('preserves pixels for the neutral viewport', () => {
    const source = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 255, 255
    ]);

    const result = new CpuViewportTransformer().transform(source, 2, 2, viewport());

    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    expect([...result.pixels]).toEqual([...source]);
  });

  it('crops around the persisted image translation and flips horizontally', () => {
    const source = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 255, 255
    ]);
    const result = new CpuViewportTransformer().transform(source, 4, 1, viewport({
      cropFrame: { x: 0.25, y: 0, width: 0.5, height: 1 },
      flipHorizontal: true
    }));

    expect(result.width).toBe(2);
    expect([...result.pixels]).toEqual([
      0, 0, 255, 255,
      0, 255, 0, 255
    ]);
  });

  it('uses the crop-frame origin when selecting source pixels', () => {
    const source = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 255, 255
    ]);
    const result = new CpuViewportTransformer().transform(source, 4, 1, viewport({
      cropFrame: { x: 0, y: 0, width: 0.5, height: 1 }
    }));

    expect([...result.pixels]).toEqual([
      255, 0, 0, 255,
      0, 255, 0, 255
    ]);
  });
});
