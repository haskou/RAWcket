import type { InspectSourceImageMessage } from '../../application/inspect-source-image/messages/InspectSourceImageMessage';
import type { SourceImageInspection, SourceImageInspector } from '../../application/ports/SourceImageInspector';
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
        cameraMake: extracted.cameraMake,
        cameraModel: extracted.cameraModel
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
      cameraMake: null,
      cameraModel: null
    };
    bitmap.close();
    return inspection;
  }
}
