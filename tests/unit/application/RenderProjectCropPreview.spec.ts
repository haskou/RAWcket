import { Timestamp } from '@haskou/value-objects';
import { RenderProjectCropPreview } from '@/contexts/projects/application/render-project-crop-preview/RenderProjectCropPreview';
import { RenderProjectCropPreviewMessage } from '@/contexts/projects/application/render-project-crop-preview/messages/RenderProjectCropPreviewMessage';
import type { PreviewRenderer, PreviewRenderRequest } from '@/contexts/projects/application/ports/PreviewRenderer';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { ViewportTransform } from '@/contexts/projects/domain/ViewportTransform';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

class RecordingCropPreviewRenderer implements PreviewRenderer {
  public request: PreviewRenderRequest | null = null;

  public render(request: PreviewRenderRequest): Promise<Blob> {
    this.request = request;
    return Promise.resolve(new Blob(['crop-preview'], { type: 'image/webp' }));
  }
}

describe('RenderProjectCropPreview', () => {
  it('renders a full crop frame while preserving the project and its geometry corrections', async () => {
    const renderer = new RecordingCropPreviewRenderer();
    const project = PhotoProjectMother.create();
    const viewport = {
      ...ViewportTransform.reset().toPrimitives(),
      cropFrame: { x: 0.1, y: 0.2, width: 0.72, height: 0.6 },
      rotationDegrees: 4,
      verticalPerspective: 9
    };
    project.apply({ kind: EDIT_OPERATION.SET_VIEWPORT_TRANSFORM, viewport, groupId: null }, Timestamp.now());

    await new RenderProjectCropPreview(renderer).render(
      project,
      new RenderProjectCropPreviewMessage(project.getId().valueOf(), 2048)
    );

    expect(renderer.request?.getRecipe().getViewport().toPrimitives()).toEqual({
      ...viewport,
      cropFrame: { x: 0, y: 0, width: 1, height: 1 }
    });
    expect(project.getViewportTransform().toPrimitives()).toEqual(viewport);
  });

  it('rejects a crop preview for a different project', () => {
    const project = PhotoProjectMother.create();
    expect(() => new RenderProjectCropPreview(new RecordingCropPreviewRenderer()).render(
      project,
      new RenderProjectCropPreviewMessage(crypto.randomUUID(), 2048)
    )).toThrow(/different project/);
  });
});
