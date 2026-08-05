import { HighDepthImageScaler } from '@/contexts/projects/infrastructure/codecs/HighDepthImageScaler';

describe('HighDepthImageScaler', () => {
  it('bilinearly resizes every 16-bit channel without quantizing to bytes', () => {
    const result = new HighDepthImageScaler().resize({
      width: 4,
      height: 2,
      channels: 3,
      bitDepth: 16,
      data: new Uint16Array([
        0, 1_000, 2_000, 10_000, 11_000, 12_000, 20_000, 21_000, 22_000, 30_000, 31_000, 32_000,
        40_000, 41_000, 42_000, 50_000, 51_000, 52_000, 60_000, 61_000, 62_000, 65_000, 65_100, 65_200
      ])
    }, 2);

    expect(result).toMatchObject({ width: 2, height: 1, channels: 3, bitDepth: 16 });
    expect([...result.data]).toEqual([25_000, 26_000, 27_000, 43_750, 44_525, 45_300]);
    expect(result.data).toBeInstanceOf(Uint16Array);
  });

  it('rejects a pixel buffer that does not match its declared dimensions', () => {
    expect(() => new HighDepthImageScaler().resize({ width: 2, height: 2, channels: 3, bitDepth: 16, data: new Uint16Array(3) }, 64)).toThrow(/dimensions/);
  });
});
