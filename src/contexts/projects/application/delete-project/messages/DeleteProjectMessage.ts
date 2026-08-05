import { ProjectId } from '../../../domain/value-objects/ProjectId';

export class DeleteProjectMessage {
  private readonly id: ProjectId;
  public constructor(id: string) {
    this.id = new ProjectId(id);
  }
  public getProjectId(): ProjectId {
    return this.id;
  }
}
