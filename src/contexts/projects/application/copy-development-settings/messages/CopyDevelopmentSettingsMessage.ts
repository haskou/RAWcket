import { ProjectId } from '../../../domain/value-objects/ProjectId';

export class CopyDevelopmentSettingsMessage {
  private readonly projectId: ProjectId;
  public constructor(projectId: string) { this.projectId = new ProjectId(projectId); }
  public getProjectId(): ProjectId { return this.projectId; }
}
