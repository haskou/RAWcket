import { RawDisplayToneMapper } from '@/contexts/projects/infrastructure/renderers/RawDisplayToneMapper';

describe('RawDisplayToneMapper', () => {
  const mapper = new RawDisplayToneMapper();

  it('keeps the display endpoints stable', () => {
    expect(mapper.map({ red: 0, green: 0, blue: 0 })).toEqual({ red: 0, green: 0, blue: 0 });
    const white = mapper.map({ red: 1, green: 1, blue: 1 });
    expect(white.red).toBeCloseTo(1, 12);
    expect(white.green).toBeCloseTo(1, 12);
    expect(white.blue).toBeCloseTo(1, 12);
  });

  it('adds a deterministic medium-contrast base curve to scene-linear midtones', () => {
    const mapped = mapper.map({ red: 0.18, green: 0.18, blue: 0.18 });

    expect(mapped.red).toBeGreaterThan(0.25);
    expect(mapped.red).toBeLessThan(0.4);
    expect(mapped.red).toBeCloseTo(mapped.green, 8);
    expect(mapped.green).toBeCloseTo(mapped.blue, 8);
  });

  it('preserves channel ratios until display clipping is required', () => {
    const mapped = mapper.map({ red: 0.24, green: 0.12, blue: 0.06 });
    const encoded = [
      1.055 * 0.24 ** (1 / 2.4) - 0.055,
      1.055 * 0.12 ** (1 / 2.4) - 0.055,
      1.055 * 0.06 ** (1 / 2.4) - 0.055
    ];

    expect(mapped.red / mapped.green).toBeCloseTo((encoded[0] ?? 0) / (encoded[1] ?? 1), 8);
    expect(mapped.green / mapped.blue).toBeCloseTo((encoded[1] ?? 0) / (encoded[2] ?? 1), 8);
  });
});
