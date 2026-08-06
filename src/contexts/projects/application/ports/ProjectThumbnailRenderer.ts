import type { ExifOrientation } from '../../domain/CaptureMetadata';

export interface ProjectThumbnailRenderer {
  render(image: Blob, orientation: ExifOrientation | null): Promise<Blob>;
}
