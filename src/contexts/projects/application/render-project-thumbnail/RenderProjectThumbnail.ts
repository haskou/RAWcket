import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import type { PreviewRenderer } from '../ports/PreviewRenderer';
import { PreviewRenderRequest } from '../ports/PreviewRenderer';
import { PreviewSize } from '../render-project-preview/PreviewSize';
import type { RenderProjectThumbnailMessage } from './messages/RenderProjectThumbnailMessage';

export class RenderProjectThumbnail {
  public constructor(
    private readonly projects: ProjectRepository,
    private readonly sourceFiles: SourceFileRepository,
    private readonly renderer: PreviewRenderer
  ) {}

  public async render(message: RenderProjectThumbnailMessage): Promise<Blob | null> {
    const [project, source] = await Promise.all([
      this.projects.findById(message.getProjectId()),
      this.sourceFiles.find(message.getProjectId())
    ]);
    if (project === null || source === null) return null;
    const thumbnail = await this.renderer.render(
      new PreviewRenderRequest(message.getProjectId(), PreviewSize.THUMBNAIL, project, project.getRecipe())
    );
    if (!(thumbnail instanceof Blob)) throw new Error('The rendered project thumbnail must be an encoded image.');
    return thumbnail;
  }
}
