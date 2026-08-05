import { RenderProjectBaseline } from '@/contexts/projects/application/render-project-baseline/RenderProjectBaseline';
import { RenderProjectBaselineMessage } from '@/contexts/projects/application/render-project-baseline/messages/RenderProjectBaselineMessage';
import type { PreviewRenderer, PreviewRenderRequest } from '@/contexts/projects/application/ports/PreviewRenderer';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

class RecordingBaselineRenderer implements PreviewRenderer {
  public request: PreviewRenderRequest | null = null;

  public render(request: PreviewRenderRequest): Promise<Blob> {
    this.request = request;
    return Promise.resolve(new Blob(['baseline'], { type: 'image/webp' }));
  }
}

describe('RenderProjectBaseline', () => {
  it('renders the same source through a neutral development recipe', async () => {
    const renderer = new RecordingBaselineRenderer();
    const project = PhotoProjectMother.create();

    await new RenderProjectBaseline(renderer).render(
      project,
      new RenderProjectBaselineMessage(project.getId().valueOf(), 2048)
    );

    expect(renderer.request?.getProject()).toBe(project);
    expect(renderer.request?.getRecipe().isNeutral()).toBe(true);
  });
});
