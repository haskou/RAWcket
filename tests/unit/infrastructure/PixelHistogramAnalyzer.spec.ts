import { PixelHistogramAnalyzer } from '@/contexts/projects/infrastructure/renderers/PixelHistogramAnalyzer';

describe('PixelHistogramAnalyzer', () => {
  it('normalizes RGB/luminance buckets and measures shadow/highlight clipping', () => {
    const result = new PixelHistogramAnalyzer().analyze(new Uint8ClampedArray([
      0, 0, 0, 255,
      255, 255, 255, 255
    ]));

    expect(result.red).toHaveLength(64);
    expect(result.luminance[0]).toBe(1);
    expect(result.luminance[63]).toBe(1);
    expect(result.shadowClipping).toBe(0.5);
    expect(result.highlightClipping).toBe(0.5);
    expect(result.backend).toBe('cpu');
  });

  it('rejects malformed pixel buffers', () => {
    expect(() => new PixelHistogramAnalyzer().analyze(new Uint8ClampedArray([0, 0, 0]))).toThrow(/RGBA/);
  });
});
