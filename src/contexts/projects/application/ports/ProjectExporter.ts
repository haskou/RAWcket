import type { ProjectId } from '../../domain/value-objects/ProjectId';

export interface ProjectExporter {
  exportProject(projectId: ProjectId): Promise<Blob>;
}
