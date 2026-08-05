import { RenderProjectPreview } from '@/contexts/projects/application/render-project-preview/RenderProjectPreview';
import { RenderProjectPreviewMessage } from '@/contexts/projects/application/render-project-preview/messages/RenderProjectPreviewMessage';
import type {
  PreviewRenderer,
  PreviewRenderControl,
  PreviewRenderRequest
} from '@/contexts/projects/application/ports/PreviewRenderer';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

class RecordingPreviewRenderer implements PreviewRenderer {
  public requestedSize = 0;
  public render(request: PreviewRenderRequest, _control?: PreviewRenderControl): Promise<Blob> {
    void _control;
    this.requestedSize = request.getSize().valueOf();
    return Promise.resolve(new Blob(['preview'], { type: 'image/webp' }));
  }
}

describe('RenderProjectPreview', () => {
  it('converts message primitives before invoking the renderer', async () => {
    const renderer = new RecordingPreviewRenderer();
    const useCase = new RenderProjectPreview(renderer);
    const project = PhotoProjectMother.create();
    const result = await useCase.render(
      project,
      new RenderProjectPreviewMessage(project.getId().valueOf(), 2048)
    );
    expect(result).toBeInstanceOf(Blob);
    expect(renderer.requestedSize).toBe(2048);
  });

  it('rejects resolutions outside the contract', () => {
    expect(() => new RenderProjectPreviewMessage(crypto.randomUUID(), 8192)).toThrow(/between 64 and 4096/);
  });
});
