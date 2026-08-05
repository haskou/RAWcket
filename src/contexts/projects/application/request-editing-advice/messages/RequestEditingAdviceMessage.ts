import { ProjectId } from '../../../domain/value-objects/ProjectId';

export class RequestEditingAdviceMessage {
  private readonly projectId: ProjectId;
  private readonly intent: string;

  public constructor(projectId: string, intent: string) {
    this.projectId = new ProjectId(projectId);
    this.intent = intent.trim();
    if (this.intent.length < 3 || this.intent.length > 500) {
      throw new Error('An AI editing request must contain between 3 and 500 characters.');
    }
  }

  public getProjectId(): ProjectId { return this.projectId; }
  public getIntent(): string { return this.intent; }
}
