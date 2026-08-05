import type { InspectSourceImageMessage } from '../../application/inspect-source-image/messages/InspectSourceImageMessage';
import type { SourceImageInspection, SourceImageInspector } from '../../application/ports/SourceImageInspector';
import { emptyCaptureMetadata } from '../../domain/CaptureMetadata';
import { ArwEmbeddedPreviewExtractor } from './ArwEmbeddedPreviewExtractor';

export class BrowserSourceImageInspector implements SourceImageInspector {
  public constructor(private readonly arw = new ArwEmbeddedPreviewExtractor()) {}

  public async inspect(message: InspectSourceImageMessage): Promise<SourceImageInspection> {
    const file = message.getFile();
    const extension = message.getFileName().split('.').at(-1)?.toLowerCase();
    if (extension === 'arw' || file.type === 'image/x-sony-arw') {
      const extracted = this.arw.extract(await file.arrayBuffer());
      return {
        width: extracted.width,
        height: extracted.height,
        mimeType: 'image/x-sony-arw',
        embeddedPreview: extracted.preview,
        captureMetadata: {
          cameraMake: extracted.cameraMake,
          cameraModel: extracted.cameraModel,
          lensModel: extracted.lensModel,
          capturedAt: extracted.capturedAt,
          exposureTimeSeconds: extracted.exposureTimeSeconds,
          apertureFNumber: extracted.apertureFNumber,
          iso: extracted.iso,
          focalLengthMm: extracted.focalLengthMm,
          orientation: extracted.orientation,
          whiteBalance: extracted.whiteBalance,
          colorSpace: extracted.colorSpace,
          blackLevel: extracted.blackLevel,
          whiteLevel: extracted.whiteLevel,
          cfaPattern: extracted.cfaPattern
        }
      };
    }
    const mimeType = file.type === 'image/png' || extension === 'png' ? 'image/png' : file.type === 'image/jpeg' || extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : null;
    if (mimeType === null) throw new Error('RAWcket supports JPEG, PNG, and Sony ARW files.');
    const bitmap = await createImageBitmap(file);
    const inspection: SourceImageInspection = {
      width: bitmap.width,
      height: bitmap.height,
      mimeType,
      embeddedPreview: null,
      captureMetadata: emptyCaptureMetadata
    };
    bitmap.close();
    return inspection;
  }
}
