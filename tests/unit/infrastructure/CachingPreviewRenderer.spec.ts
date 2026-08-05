import { PreviewRenderRequest, type PreviewAnalysis, type PreviewRenderer } from '@/contexts/projects/application/ports/PreviewRenderer';
import { PreviewSize } from '@/contexts/projects/application/render-project-preview/PreviewSize';
import { CachingPreviewRenderer } from '@/contexts/projects/infrastructure/renderers/CachingPreviewRenderer';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

const analysis: PreviewAnalysis = {
  red: new Array<number>(64).fill(0),
  green: new Array<number>(64).fill(0),
  blue: new Array<number>(64).fill(0),
  luminance: new Array<number>(64).fill(0),
  shadowClipping: 0,
  highlightClipping: 0,
  backend: 'cpu',
  sourcePrecision: 'standard-8-bit',
  rawFallbackReason: null
};

describe('CachingPreviewRenderer', () => {
  it('reuses immutable rendered output for the same source, recipe, and preview size', async () => {
    const image = new Blob(['preview'], { type: 'image/webp' });
    const render = vi.fn<PreviewRenderer['render']>((_request, control) => {
      control?.onAnalysis?.(analysis);
      return Promise.resolve(image);
    });
    const renderer = new CachingPreviewRenderer({ render });
    const project = PhotoProjectMother.create();
    const request = new PreviewRenderRequest(project.getId(), new PreviewSize(2048), project);
    const stages: string[] = [];

    await renderer.render(request);
    const cached = await renderer.render(request, { onProgress: (progress) => stages.push(progress.stage) });

    expect(cached).toBe(image);
    expect(render).toHaveBeenCalledTimes(1);
    expect(stages).toEqual(['cached']);
  });

  it('evicts the least recently used entry when the configured byte budget is exceeded', async () => {
    const render = vi.fn<PreviewRenderer['render']>((_request, control) => {
      control?.onAnalysis?.(analysis);
      return Promise.resolve(new Blob(['12345'], { type: 'image/webp' }));
    });
    const renderer = new CachingPreviewRenderer({ render }, 8, 8);
    const first = PhotoProjectMother.create();
    const second = PhotoProjectMother.create();

    await renderer.render(new PreviewRenderRequest(first.getId(), new PreviewSize(2048), first));
    await renderer.render(new PreviewRenderRequest(second.getId(), new PreviewSize(2048), second));
    await renderer.render(new PreviewRenderRequest(first.getId(), new PreviewSize(2048), first));

    expect(render).toHaveBeenCalledTimes(3);
  });
});
