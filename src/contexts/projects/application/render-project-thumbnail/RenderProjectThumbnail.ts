import type { ProjectThumbnailRenderer } from '../ports/ProjectThumbnailRenderer';
import type { SourceImageInspector } from '../ports/SourceImageInspector';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import { InspectSourceImageMessage } from '../inspect-source-image/messages/InspectSourceImageMessage';
import type { RenderProjectThumbnailMessage } from './messages/RenderProjectThumbnailMessage';

export class RenderProjectThumbnail {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly sourceFiles: SourceFileRepository,
    private readonly sourceImageInspector: SourceImageInspector,
    private readonly renderer: ProjectThumbnailRenderer
  ) {}

  public async render(message: RenderProjectThumbnailMessage): Promise<Blob | null> {
    const [project, source] = await Promise.all([
      this.projects.findById(message.getProjectId()),
      this.sourceFiles.find(message.getProjectId())
    ]);
    if (project === null || source === null) return null;
    const inspection = await this.sourceImageInspector.inspect(
      new InspectSourceImageMessage(source, project.getSource().getFileName().valueOf())
    );
    const preview = inspection.embeddedPreview ?? source;
    return this.renderer.render(preview, project.getCaptureMetadata().getOrientation());
  }
}
