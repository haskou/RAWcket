import { RenderProjectThumbnail } from '@/contexts/projects/application/render-project-thumbnail/RenderProjectThumbnail';
import { RenderProjectThumbnailMessage } from '@/contexts/projects/application/render-project-thumbnail/messages/RenderProjectThumbnailMessage';
import type { ProjectThumbnailRenderer } from '@/contexts/projects/application/ports/ProjectThumbnailRenderer';
import type { SourceImageInspector } from '@/contexts/projects/application/ports/SourceImageInspector';
import { ExifOrientation } from '@/contexts/projects/domain/CaptureMetadata';
import { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import type { ProjectRepository } from '@/contexts/projects/domain/repositories/ProjectRepository';
import type { SourceFileRepository } from '@/contexts/projects/domain/repositories/SourceFileRepository';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('RenderProjectThumbnail', () => {
  it('renders an embedded RAW preview with the source EXIF orientation', async () => {
    const find = vi.fn<SourceFileRepository['find']>();
    const findById = vi.fn<ProjectRepository['findById']>();
    const inspect = vi.fn<SourceImageInspector['inspect']>();
    const render = vi.fn<ProjectThumbnailRenderer['render']>();
    const sourceFiles = { find, save: vi.fn(), delete: vi.fn() } satisfies SourceFileRepository;
    const projects = { findById, findAll: vi.fn(), save: vi.fn(), delete: vi.fn() } satisfies ProjectRepository;
    const inspector = { inspect } satisfies SourceImageInspector;
    const renderer = { render } satisfies ProjectThumbnailRenderer;
    const source = new Blob(['raw'], { type: 'image/x-sony-arw' });
    const embeddedPreview = new Blob(['preview'], { type: 'image/jpeg' });
    const rendered = new Blob(['thumbnail'], { type: 'image/webp' });
    const baseProject = PhotoProjectMother.create();
    const project = PhotoProject.fromPrimitives({
      ...baseProject.toPrimitives(),
      captureMetadata: { ...baseProject.toPrimitives().captureMetadata, orientation: 6 }
    });
    findById.mockResolvedValue(project);
    find.mockResolvedValue(source);
    inspect.mockResolvedValue({
      width: 4_000,
      height: 6_000,
      mimeType: 'image/x-sony-arw',
      embeddedPreview,
      captureMetadata: project.getCaptureMetadata().toPrimitives()
    });
    render.mockResolvedValue(rendered);

    const result = await new RenderProjectThumbnail(projects, sourceFiles, inspector, renderer).render(
      new RenderProjectThumbnailMessage(project.getId().valueOf())
    );

    expect(result).toBe(rendered);
    const orientation = render.mock.calls[0]?.[1];
    expect(orientation?.isEqual(new ExifOrientation(6))).toBe(true);
  });

  it('returns no thumbnail when the original is missing', async () => {
    const find = vi.fn<SourceFileRepository['find']>().mockResolvedValue(null);
    const findById = vi.fn<ProjectRepository['findById']>().mockResolvedValue(null);
    const inspect = vi.fn<SourceImageInspector['inspect']>();
    const sourceFiles = { find, save: vi.fn(), delete: vi.fn() } satisfies SourceFileRepository;
    const projects = { findById, findAll: vi.fn(), save: vi.fn(), delete: vi.fn() } satisfies ProjectRepository;
    const inspector = { inspect } satisfies SourceImageInspector;
    const renderer = { render: vi.fn<ProjectThumbnailRenderer['render']>() } satisfies ProjectThumbnailRenderer;

    const result = await new RenderProjectThumbnail(projects, sourceFiles, inspector, renderer).render(
      new RenderProjectThumbnailMessage('0f416f85-88cb-45c5-bb29-85203546ee51')
    );

    expect(result).toBeNull();
    expect(inspect.mock.calls).toHaveLength(0);
  });
});
