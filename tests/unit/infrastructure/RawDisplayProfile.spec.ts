import { RawDisplayProfile, type RawDisplayStatistics } from '@/contexts/projects/domain/RawDisplayProfile';

describe('RawDisplayProfile', () => {
  it('matches the camera preview tone, chromaticity, and saturation within bounded limits', () => {
    const source: RawDisplayStatistics = {
      mean: { red: 0.53, green: 0.47, blue: 0.41 },
      meanSaturation: 0.28,
      luminanceP05: 0.04,
      luminanceP50: 0.57,
      luminanceP95: 0.77
    };
    const camera: RawDisplayStatistics = {
      mean: { red: 0.55, green: 0.46, blue: 0.38 },
      meanSaturation: 0.36,
      luminanceP05: 0.02,
      luminanceP50: 0.56,
      luminanceP95: 0.79
    };

    const profile = RawDisplayProfile.estimate(source, camera).toPrimitives();

    expect(profile.redGain).toBeGreaterThan(1);
    expect(profile.blueGain).toBeLessThan(1);
    expect(profile.targetMedian).toBe(0.56);
    expect(profile.shadowContrast).toBeGreaterThan(1);
    expect(profile.highlightContrast).toBeGreaterThan(1);
    expect(profile.chroma).toBe(1);
  });

  it('maps the source median to the camera median while enriching color', () => {
    const profile = RawDisplayProfile.fromPrimitives({
      redGain: 1,
      greenGain: 1,
      blueGain: 1,
      sourceMedian: 0.5,
      targetMedian: 0.56,
      shadowContrast: 1.02,
      highlightContrast: 1.12,
      chroma: 1.3
    });

    const rendered = profile.render({ red: 0.6, green: 0.48, blue: 0.36 });
    const luminance = rendered.red * 0.2126 + rendered.green * 0.7152 + rendered.blue * 0.0722;

    expect(luminance).toBeGreaterThan(0.55);
    expect(rendered.red - rendered.blue).toBeGreaterThan(0.24);
  });

  it('matches chroma after tone and channel calibration have been measured', () => {
    const profile = RawDisplayProfile.neutral().matchChroma(0.33, 0.36).toPrimitives();

    expect(profile.chroma).toBeCloseTo(0.36 / 0.33, 6);
  });
});
