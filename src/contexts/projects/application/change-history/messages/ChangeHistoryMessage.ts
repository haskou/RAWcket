import { ProjectId } from '../../../domain/value-objects/ProjectId';

export class ChangeHistoryMessage {
  private readonly projectId: ProjectId;
  public constructor(projectId: string, private readonly occurredAt = Date.now()) {
    this.projectId = new ProjectId(projectId);
  }
  public getProjectId(): ProjectId {
    return this.projectId;
  }
  public getOccurredAt(): number {
    return this.occurredAt;
  }
}
