import type { EditOperation } from '../../../domain/EditOperation';
import { ProjectId } from '../../../domain/value-objects/ProjectId';

export class ApplyEditOperationMessage {
  private readonly projectId: ProjectId;
  public constructor(
    projectId: string,
    private readonly operation: EditOperation,
    private readonly occurredAt = Date.now()
  ) {
    this.projectId = new ProjectId(projectId);
  }
  public getProjectId(): ProjectId {
    return this.projectId;
  }
  public getOperation(): EditOperation {
    return structuredClone(this.operation);
  }
  public getOccurredAt(): number {
    return this.occurredAt;
  }
}
