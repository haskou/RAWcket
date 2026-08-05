import type { PhotoProject } from '../../domain/PhotoProject';
import type { PhotoExporter } from '../ports/PhotoExporter';
import type { PreviewRenderControl } from '../ports/PreviewRenderer';
import type { ExportProjectPhotoMessage } from './messages/ExportProjectPhotoMessage';

export class ExportProjectPhoto {
  public constructor(private readonly exporter: PhotoExporter) {}

  public export(
    project: PhotoProject,
    message: ExportProjectPhotoMessage,
    control: PreviewRenderControl = {}
  ): Promise<Blob> {
    if (!project.isIdentifiedBy(message.getProjectId())) {
      throw new Error('The photo export request belongs to a different project.');
    }
    return this.exporter.export(project, message, control);
  }
}
