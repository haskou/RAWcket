import type { PhotoProject } from '../PhotoProject';
import type { PhotoProjectSummary } from '../PhotoProjectSummary';
import type { ProjectId } from '../value-objects/ProjectId';

export interface ProjectRepository {
  findById(id: ProjectId): Promise<PhotoProject | null>;
  findAll(): Promise<PhotoProjectSummary[]>;
  save(project: PhotoProject): Promise<void>;
  delete(id: ProjectId): Promise<void>;
}
