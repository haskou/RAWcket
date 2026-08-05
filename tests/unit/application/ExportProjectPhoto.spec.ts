import { ExportProjectPhoto } from '@/contexts/projects/application/export-project-photo/ExportProjectPhoto';
import { ExportProjectPhotoMessage } from '@/contexts/projects/application/export-project-photo/messages/ExportProjectPhotoMessage';
import type { PhotoExporter } from '@/contexts/projects/application/ports/PhotoExporter';
import { PhotoProjectMother } from '../../mothers/PhotoProjectMother';

describe('ExportProjectPhoto', () => {
  it('validates output options and delegates the aggregate to the exporter', async () => {
    const project = PhotoProjectMother.create();
    const exportMock = vi.fn<PhotoExporter['export']>();
    const exporter: PhotoExporter = { export: exportMock };
    const expected = new Blob(['image'], { type: 'image/jpeg' });
    exportMock.mockResolvedValue(expected);
    const message = new ExportProjectPhotoMessage(project.getId().valueOf(), 'jpeg', 0.92, 2048);

    const result = await new ExportProjectPhoto(exporter).export(project, message);

    expect(result).toBe(expected);
    expect(exportMock.mock.calls[0]).toEqual([project, message, {}]);
  });

  it('rejects invalid quality and dimensions at the application boundary', () => {
    const id = crypto.randomUUID();
    expect(() => new ExportProjectPhotoMessage(id, 'jpeg', 0, null)).toThrow(/quality/);
    expect(() => new ExportProjectPhotoMessage(id, 'png', 1, 100)).toThrow(/edge/);
  });
});
