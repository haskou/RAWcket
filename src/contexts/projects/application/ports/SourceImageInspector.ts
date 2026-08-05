import type { InspectSourceImageMessage } from '../inspect-source-image/messages/InspectSourceImageMessage';
import type { CaptureMetadataPrimitives } from '../../domain/CaptureMetadata';

export type SourceImageInspection = {
  width: number;
  height: number;
  mimeType: 'image/jpeg' | 'image/png' | 'image/x-sony-arw';
  embeddedPreview: Blob | null;
  captureMetadata: CaptureMetadataPrimitives;
};

export interface SourceImageInspector {
  inspect(message: InspectSourceImageMessage): Promise<SourceImageInspection>;
}
