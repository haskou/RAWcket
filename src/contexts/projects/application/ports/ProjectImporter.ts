import type { ProjectId } from '../../domain/value-objects/ProjectId';

export interface ProjectImporter {
  importProject(bundle: Blob): Promise<ProjectId>;
}
