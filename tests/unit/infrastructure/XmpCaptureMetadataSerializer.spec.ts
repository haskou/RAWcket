import { XmpCaptureMetadataSerializer } from '@/contexts/projects/infrastructure/renderers/XmpCaptureMetadataSerializer';
import { emptyCaptureMetadata } from '@/contexts/projects/domain/CaptureMetadata';

describe('XmpCaptureMetadataSerializer', () => {
  it('serializes only public camera and capture fields as escaped standard XMP', () => {
    const xmp = new XmpCaptureMetadataSerializer().serialize({
      ...emptyCaptureMetadata,
      cameraMake: 'Sony & Co',
      cameraModel: 'α6600',
      lensModel: 'E 35mm <Prime>',
      capturedAt: '2026:08:05 12:00:00',
      exposureTimeSeconds: 0.008,
      apertureFNumber: 2.8,
      iso: 400,
      focalLengthMm: 35,
      blackLevel: 512,
      whiteLevel: 16_383,
      cfaPattern: 'RGGB'
    });

    expect(xmp).toContain('tiff:Make="Sony &amp; Co"');
    expect(xmp).toContain('exif:Lens="E 35mm &lt;Prime&gt;"');
    expect(xmp).toContain('exif:ExposureTime="1/125"');
    expect(xmp).toContain('exif:FNumber="14/5"');
    expect(xmp).toContain('exif:ISOSpeedRatings="400"');
    expect(xmp).not.toContain('RGGB');
    expect(xmp).not.toContain('16383');
  });

  it('does not create a metadata packet when no preservable fields exist', () => {
    expect(new XmpCaptureMetadataSerializer().serialize(emptyCaptureMetadata)).toBeNull();
  });
});
