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

  it('places scene-linear midtones on a photographic display curve', () => {
    const mapped = mapper.map({ red: 0.18, green: 0.18, blue: 0.18 });

    expect(mapped.red).toBeGreaterThan(0.4);
    expect(mapped.red).toBeLessThan(0.48);
    expect(mapped.red).toBeCloseTo(mapped.green, 8);
    expect(mapped.green).toBeCloseTo(mapped.blue, 8);
  });

  it('adds bounded photographic chroma without shifting luminance', () => {
    const mapped = mapper.map({ red: 0.24, green: 0.12, blue: 0.06 });
    const encoded = [
      1.055 * 0.24 ** (1 / 2.4) - 0.055,
      1.055 * 0.12 ** (1 / 2.4) - 0.055,
      1.055 * 0.06 ** (1 / 2.4) - 0.055
    ];
    const encodedLuminance = (encoded[0] ?? 0) * 0.2126 + (encoded[1] ?? 0) * 0.7152 + (encoded[2] ?? 0) * 0.0722;
    const mappedLuminance = mapped.red * 0.2126 + mapped.green * 0.7152 + mapped.blue * 0.0722;
    const expectedLuminance = encodedLuminance * encodedLuminance * (3 - 2 * encodedLuminance);
    const encodedChroma = Math.max(...encoded) - Math.min(...encoded);
    const mappedChroma = Math.max(mapped.red, mapped.green, mapped.blue) - Math.min(mapped.red, mapped.green, mapped.blue);

    expect(mappedLuminance).toBeCloseTo(expectedLuminance, 8);
    expect(mappedChroma).toBeGreaterThan(encodedChroma);
    expect(mapped.red).toBeLessThanOrEqual(1);
    expect(mapped.blue).toBeGreaterThanOrEqual(0);
  });
});
