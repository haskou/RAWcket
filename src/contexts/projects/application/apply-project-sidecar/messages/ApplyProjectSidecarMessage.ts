import { ProjectId } from '../../../domain/value-objects/ProjectId';

export class ApplyProjectSidecarMessage {
  private readonly projectId: ProjectId;
  public constructor(projectId: string, private readonly sidecar: Blob, private readonly occurredAt = Date.now()) {
    this.projectId = new ProjectId(projectId);
    if (sidecar.size === 0 || sidecar.size > 5_000_000) throw new Error('A sidecar must contain between 1 byte and 5 MB.');
  }
  public getProjectId(): ProjectId { return this.projectId; }
  public getSidecar(): Blob { return this.sidecar; }
  public getOccurredAt(): number { return this.occurredAt; }
}
