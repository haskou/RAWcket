import type { StoredSourceFile } from '../StoredSourceFile';
import type { ProjectId } from '../value-objects/ProjectId';

export interface SourceFileRepository {
  save(projectId: ProjectId, file: Blob): Promise<StoredSourceFile>;
  find(projectId: ProjectId): Promise<Blob | null>;
  delete(projectId: ProjectId): Promise<void>;
}
