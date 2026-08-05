import { ProjectId } from '../../../domain/value-objects/ProjectId';

export class RequestPhotoOpinionMessage {
  private readonly projectId: ProjectId;

  public constructor(
    projectId: string,
    private readonly preview: Blob,
    private readonly shadowClipping: number,
    private readonly highlightClipping: number
  ) {
    this.projectId = new ProjectId(projectId);
    this.assertRatio(shadowClipping);
    this.assertRatio(highlightClipping);
    if (preview.size === 0) throw new Error('A rendered preview is required for an AI opinion.');
  }

  public getProjectId(): ProjectId { return this.projectId; }
  public getPreview(): Blob { return this.preview; }
  public getShadowClipping(): number { return this.shadowClipping; }
  public getHighlightClipping(): number { return this.highlightClipping; }

  private assertRatio(value: number): void {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Clipping ratios must be between 0 and 1.');
  }
}
