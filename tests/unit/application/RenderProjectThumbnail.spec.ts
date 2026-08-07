import { Timestamp } from '@haskou/value-objects';
import { RenderProjectThumbnail } from '@/contexts/projects/application/render-project-thumbnail/RenderProjectThumbnail';
import { RenderProjectThumbnailMessage } from '@/contexts/projects/application/render-project-thumbnail/messages/RenderProjectThumbnailMessage';
import type { PreviewRenderer } from '@/contexts/projects/application/ports/PreviewRenderer';
import { PreviewSize } from '@/contexts/projects/application/render-project-preview/PreviewSize';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import type { ProjectRepository } from '@/contexts/projects/domain/repositories/ProjectRepository';
import type { SourceFileRepository } from '@/contexts/projects/domain/repositories/SourceFileRepository';
import { AdjustmentKey } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import { GlobalAdjustmentValue } from '@/contexts/projects/domain/value-objects/GlobalAdjustmentValue';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('RenderProjectThumbnail', () => {
  it('renders the current developed recipe at thumbnail size', async () => {
    const find = vi.fn<SourceFileRepository['find']>();
    const findById = vi.fn<ProjectRepository['findById']>();
    const render = vi.fn<PreviewRenderer['render']>();
    const sourceFiles = { find, save: vi.fn(), delete: vi.fn() } satisfies SourceFileRepository;
    const projects = { findById, findAll: vi.fn(), save: vi.fn(), delete: vi.fn() } satisfies ProjectRepository;
    const renderer = { render } satisfies PreviewRenderer;
    const source = new Blob(['raw'], { type: 'image/x-sony-arw' });
    const rendered = new Blob(['thumbnail'], { type: 'image/webp' });
    const project = PhotoProjectMother.create();
    project.apply(
      { kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key: 'exposure', value: 0.75, groupId: null },
      Timestamp.now()
    );
    findById.mockResolvedValue(project);
    find.mockResolvedValue(source);
    render.mockResolvedValue(rendered);

    const result = await new RenderProjectThumbnail(projects, sourceFiles, renderer).render(
      new RenderProjectThumbnailMessage(project.getId().valueOf())
    );

    expect(result).toBe(rendered);
    const request = render.mock.calls[0]?.[0];
    expect(request?.getProject()).toBe(project);
    expect(request?.getSize().isEqual(PreviewSize.THUMBNAIL)).toBe(true);
    const exposure = AdjustmentKey.fromPrimitives('exposure');
    expect(request?.getRecipe().getGlobalAdjustment(exposure).isEqual(GlobalAdjustmentValue.for(exposure, 0.75))).toBe(true);
  });

  it('returns no thumbnail when the original is missing', async () => {
    const find = vi.fn<SourceFileRepository['find']>().mockResolvedValue(null);
    const findById = vi.fn<ProjectRepository['findById']>().mockResolvedValue(null);
    const sourceFiles = { find, save: vi.fn(), delete: vi.fn() } satisfies SourceFileRepository;
    const projects = { findById, findAll: vi.fn(), save: vi.fn(), delete: vi.fn() } satisfies ProjectRepository;
    const renderer = { render: vi.fn<PreviewRenderer['render']>() } satisfies PreviewRenderer;

    const result = await new RenderProjectThumbnail(projects, sourceFiles, renderer).render(
      new RenderProjectThumbnailMessage('0f416f85-88cb-45c5-bb29-85203546ee51')
    );

    expect(result).toBeNull();
    expect(renderer.render).not.toHaveBeenCalled();
  });
});
