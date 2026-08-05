import type { PhotoProject } from '../../domain/PhotoProject';
import type { PreviewRenderControl, PreviewRenderer } from '../ports/PreviewRenderer';
import { PreviewRenderRequest } from '../ports/PreviewRenderer';
import type { RenderProjectCropPreviewMessage } from './messages/RenderProjectCropPreviewMessage';

export class RenderProjectCropPreview {
  public constructor(private readonly renderer: PreviewRenderer) {}

  public render(
    project: PhotoProject,
    message: RenderProjectCropPreviewMessage,
    control?: PreviewRenderControl
  ): Promise<ImageBitmap | Blob> {
    if (!project.isIdentifiedBy(message.getProjectId())) {
      throw new Error('The crop preview request belongs to a different project.');
    }
    const recipe = project.getRecipe();
    recipe.replaceViewport(project.getViewportTransform().revealFullCropFrame());
    return this.renderer.render(
      new PreviewRenderRequest(message.getProjectId(), message.getSize(), project, recipe),
      control
    );
  }
}
