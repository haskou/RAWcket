import { ToneCurveLut } from '@/contexts/projects/infrastructure/renderers/ToneCurveLut';

describe('ToneCurveLut', () => {
  it('keeps the identity curve stable', () => {
    const lut = ToneCurveLut.create({ points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'linear' });
    expect(lut.evaluate(0.5)).toBeCloseTo(0.5, 3);
  });

  it('keeps monotonic cubic interpolation inside normalized bounds', () => {
    const lut = ToneCurveLut.create({
      points: [{ x: 0, y: 0 }, { x: 0.3, y: 0.15 }, { x: 0.7, y: 0.85 }, { x: 1, y: 1 }],
      interpolation: 'monotonic-cubic'
    });
    const samples = Array.from({ length: 101 }, (_value, index) => lut.evaluate(index / 100));
    expect(samples.every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(samples.every((value, index) => index === 0 || value >= (samples[index - 1] ?? 0))).toBe(true);
  });

  it('provides an immutable copy for GPU texture upload', () => {
    const lut = ToneCurveLut.create({ points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'linear' });
    const first = lut.toFloat32Array();
    first[512] = 0;

    expect(lut.toFloat32Array()[512]).toBeGreaterThan(0.49);
  });
});
