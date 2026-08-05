import type {
  PreviewRenderer,
  PreviewRenderControl
} from '../ports/PreviewRenderer';
import { PreviewRenderRequest } from '../ports/PreviewRenderer';
import type { PhotoProject } from '../../domain/PhotoProject';
import type { RenderProjectPreviewMessage } from './messages/RenderProjectPreviewMessage';

export class RenderProjectPreview {
  public constructor(private readonly renderer: PreviewRenderer) {}

  public render(
    project: PhotoProject,
    message: RenderProjectPreviewMessage,
    control?: PreviewRenderControl
  ): Promise<ImageBitmap | Blob> {
    if (!project.isIdentifiedBy(message.getProjectId())) {
      throw new Error('The preview request belongs to a different project.');
    }
    return this.renderer.render(
      new PreviewRenderRequest(message.getProjectId(), message.getSize(), project, project.getRecipe()),
      control
    );
  }
}
