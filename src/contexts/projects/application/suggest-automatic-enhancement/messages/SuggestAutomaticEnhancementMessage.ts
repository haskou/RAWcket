import { ProjectId } from '../../../domain/value-objects/ProjectId';

export class SuggestAutomaticEnhancementMessage {
  private readonly projectId: ProjectId;

  public constructor(projectId: string, private readonly shadowClipping: number, private readonly highlightClipping: number) {
    this.projectId = new ProjectId(projectId);
    this.assertRatio('Shadow clipping', shadowClipping);
    this.assertRatio('Highlight clipping', highlightClipping);
  }

  public getProjectId(): ProjectId { return this.projectId; }
  public getShadowClipping(): number { return this.shadowClipping; }
  public getHighlightClipping(): number { return this.highlightClipping; }

  private assertRatio(label: string, value: number): void {
    if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label} must be between zero and one.`);
  }
}
