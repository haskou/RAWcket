import { DevelopmentRecipe } from '../../domain/DevelopmentRecipe';
import type { PhotoProject } from '../../domain/PhotoProject';
import type { PreviewRenderControl, PreviewRenderer } from '../ports/PreviewRenderer';
import { PreviewRenderRequest } from '../ports/PreviewRenderer';
import type { RenderProjectBaselineMessage } from './messages/RenderProjectBaselineMessage';

export class RenderProjectBaseline {
  public constructor(private readonly renderer: PreviewRenderer) {}

  public render(
    project: PhotoProject,
    message: RenderProjectBaselineMessage,
    control?: PreviewRenderControl
  ): Promise<ImageBitmap | Blob> {
    if (!project.isIdentifiedBy(message.getProjectId())) {
      throw new Error('The baseline request belongs to a different project.');
    }
    return this.renderer.render(
      new PreviewRenderRequest(message.getProjectId(), message.getSize(), project, DevelopmentRecipe.neutral()),
      control
    );
  }
}
