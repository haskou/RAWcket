import { ProjectId } from '../../../domain/value-objects/ProjectId';

export type PhotoExportFormat = 'jpeg' | 'png' | 'tiff';

export class ExportProjectPhotoMessage {
  private readonly projectId: ProjectId;

  public constructor(
    projectId: string,
    private readonly format: PhotoExportFormat,
    private readonly quality: number,
    private readonly maximumEdge: number | null
  ) {
    this.projectId = new ProjectId(projectId);
    if (!Number.isFinite(quality) || quality < 0.1 || quality > 1) {
      throw new Error('Export quality must be between 0.1 and 1.');
    }
    if (maximumEdge !== null && (!Number.isSafeInteger(maximumEdge) || maximumEdge < 256 || maximumEdge > 16_384)) {
      throw new Error('The export edge must be between 256 and 16384 pixels.');
    }
  }

  public getProjectId(): ProjectId { return this.projectId; }
  public getFormat(): PhotoExportFormat { return this.format; }
  public getMimeType(): 'image/jpeg' | 'image/png' | 'image/tiff' {
    if (this.format === 'jpeg') return 'image/jpeg';
    return this.format === 'png' ? 'image/png' : 'image/tiff';
  }
  public getQuality(): number { return this.quality; }
  public getMaximumEdge(): number | null { return this.maximumEdge; }
}
