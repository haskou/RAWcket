import { CaptureMetadata, emptyCaptureMetadata, ExifOrientation } from '@/contexts/projects/domain/CaptureMetadata';

describe('CaptureMetadata', () => {
  it('validates and serializes photographic source facts', () => {
    const metadata = CaptureMetadata.fromPrimitives({
      ...emptyCaptureMetadata,
      cameraMake: ' SONY ',
      cameraModel: 'ILCE-6600',
      exposureTimeSeconds: 1 / 125,
      apertureFNumber: 2.8,
      iso: 640,
      focalLengthMm: 35,
      orientation: 1,
      whiteBalance: 'manual',
      colorSpace: 'srgb',
      blackLevel: 512,
      whiteLevel: 16_383,
      cfaPattern: 'RGGB'
    });

    expect(metadata.isEmpty()).toBe(false);
    expect(metadata.getOrientation()?.isEqual(new ExifOrientation(1))).toBe(true);
    expect(metadata.toPrimitives()).toMatchObject({ cameraMake: 'SONY', cameraModel: 'ILCE-6600', iso: 640, cfaPattern: 'RGGB' });
  });

  it('rejects inconsistent sensor levels', () => {
    expect(() => CaptureMetadata.fromPrimitives({ ...emptyCaptureMetadata, blackLevel: 1024, whiteLevel: 512 })).toThrow(/white level/);
  });
});
