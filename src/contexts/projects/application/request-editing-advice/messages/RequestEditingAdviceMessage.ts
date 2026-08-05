import { ProjectId } from '../../../domain/value-objects/ProjectId';

export class RequestEditingAdviceMessage {
  private readonly projectId: ProjectId;
  private readonly intent: string | null;

  public constructor(
    projectId: string,
    intent: string,
    private readonly preview: Blob,
    private readonly shadowClipping = 0,
    private readonly highlightClipping = 0
  ) {
    this.projectId = new ProjectId(projectId);
    const normalizedIntent = intent.trim();
    this.intent = normalizedIntent.length === 0 ? null : normalizedIntent;
    if (this.intent !== null && (this.intent.length < 3 || this.intent.length > 500)) {
      throw new Error('An AI editing request must contain between 3 and 500 characters.');
    }
    if (preview.size === 0) throw new Error('A rendered preview is required for AI editing advice.');
    this.assertRatio(shadowClipping);
    this.assertRatio(highlightClipping);
  }

  public getProjectId(): ProjectId { return this.projectId; }
  public getIntent(): string | null { return this.intent; }
  public getPreview(): Blob { return this.preview; }
  public getShadowClipping(): number { return this.shadowClipping; }
  public getHighlightClipping(): number { return this.highlightClipping; }

  private assertRatio(value: number): void {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Clipping ratios must be between 0 and 1.');
  }
}
