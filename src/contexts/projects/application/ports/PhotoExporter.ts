import type { ExportProjectPhotoMessage } from '../export-project-photo/messages/ExportProjectPhotoMessage';
import type { PhotoProject } from '../../domain/PhotoProject';
import type { PreviewRenderControl } from './PreviewRenderer';

export interface PhotoExporter {
  export(project: PhotoProject, message: ExportProjectPhotoMessage, control?: PreviewRenderControl): Promise<Blob>;
}
