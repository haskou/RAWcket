import { ProjectId } from '../../../domain/value-objects/ProjectId';
import { PreviewSize } from '../../render-project-preview/PreviewSize';

export class RenderProjectBaselineMessage {
  private readonly projectId: ProjectId;
  private readonly size: PreviewSize;

  public constructor(projectId: string, maximumEdge: number) {
    this.projectId = new ProjectId(projectId);
    this.size = new PreviewSize(maximumEdge);
  }

  public getProjectId(): ProjectId {
    return this.projectId;
  }

  public getSize(): PreviewSize {
    return this.size;
  }
}
