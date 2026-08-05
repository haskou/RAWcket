import type { InspectSourceImageMessage } from '../inspect-source-image/messages/InspectSourceImageMessage';

export type SourceImageInspection = {
  width: number;
  height: number;
  mimeType: 'image/jpeg' | 'image/png' | 'image/x-sony-arw';
  embeddedPreview: Blob | null;
  cameraMake: string | null;
  cameraModel: string | null;
};

export interface SourceImageInspector {
  inspect(message: InspectSourceImageMessage): Promise<SourceImageInspection>;
}
