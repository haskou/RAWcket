import { RawDisplayStatisticsAnalyzer } from '@/contexts/projects/infrastructure/renderers/RawDisplayStatisticsAnalyzer';
import { RawDisplayToneMapper } from '@/contexts/projects/infrastructure/renderers/RawDisplayToneMapper';

describe('RawDisplayStatisticsAnalyzer', () => {
  it('measures camera-preview luminance and saturation', () => {
    const statistics = new RawDisplayStatisticsAnalyzer().analyzeBytes(new Uint8ClampedArray([
      255, 0, 0, 255,
      128, 128, 128, 255,
      0, 0, 0, 255,
      255, 255, 255, 255
    ]));

    expect(statistics.mean.red).toBeCloseTo(0.625, 3);
    expect(statistics.meanSaturation).toBeCloseTo(0.25, 3);
    expect(statistics.luminanceP95).toBe(1);
  });

  it('measures the same display transform used for linear RAW development', () => {
    const statistics = new RawDisplayStatisticsAnalyzer().analyzeLinear(
      new Uint16Array([16_384, 16_384, 16_384, 32_768, 16_384, 8_192]),
      new RawDisplayToneMapper()
    );

    expect(statistics.luminanceP50).toBeGreaterThan(0.5);
    expect(statistics.meanSaturation).toBeGreaterThan(0);
  });
});
