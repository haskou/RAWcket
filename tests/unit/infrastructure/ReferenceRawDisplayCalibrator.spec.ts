import { ReferenceRawDisplayCalibrator } from '@/contexts/projects/infrastructure/renderers/ReferenceRawDisplayCalibrator';
import { RawDisplayStatisticsAnalyzer } from '@/contexts/projects/infrastructure/renderers/RawDisplayStatisticsAnalyzer';
import { RawDisplayToneMapper } from '@/contexts/projects/infrastructure/renderers/RawDisplayToneMapper';

describe('ReferenceRawDisplayCalibrator', () => {
  it('derives a bounded display profile from a RAW and its matching camera JPEG', async () => {
    const decode = vi.fn().mockResolvedValue({
      width: 1,
      height: 3,
      channels: 3,
      bitDepth: 16,
      data: new Uint16Array([
        35_000, 24_000, 18_000,
        45_000, 38_000, 32_000,
        4_000, 3_500, 3_000
      ])
    });
    const read = vi.fn().mockResolvedValue(new Uint8ClampedArray([
      220, 120, 60, 255,
      240, 190, 150, 255,
      15, 10, 8, 255
    ]));
    const calibrator = new ReferenceRawDisplayCalibrator(
      { decode },
      { read },
      new RawDisplayStatisticsAnalyzer(),
      new RawDisplayToneMapper()
    );

    const profile = await calibrator.calibrate(
      new Blob(['raw'], { type: 'image/x-sony-arw' }),
      new Blob(['camera'], { type: 'image/jpeg' })
    );

    expect(decode).toHaveBeenCalledWith(expect.any(ArrayBuffer), 2_048);
    expect(read).toHaveBeenCalledTimes(1);
    const serialized = profile.toPrimitives();
    expect(serialized.chroma).toBeGreaterThanOrEqual(0.8);
    expect(serialized.chroma).toBeLessThanOrEqual(1.5);
    expect(serialized.shadowContrast).toBeGreaterThanOrEqual(0.75);
    expect(serialized.shadowContrast).toBeLessThanOrEqual(1.35);
    expect(serialized.highlightContrast).toBeGreaterThanOrEqual(0.75);
    expect(serialized.highlightContrast).toBeLessThanOrEqual(1.35);
  });
});
