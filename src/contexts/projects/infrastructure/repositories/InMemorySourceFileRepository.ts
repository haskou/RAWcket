import { StringValueObject } from '@haskou/value-objects';
import { StoredSourceFile } from '../../domain/StoredSourceFile';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import type { ProjectId } from '../../domain/value-objects/ProjectId';

export class InMemorySourceFileRepository implements SourceFileRepository {
  private readonly files = new Map<string, Blob>();
  public save(projectId: ProjectId, file: Blob): Promise<StoredSourceFile> {
    this.files.set(projectId.valueOf(), file);
    return Promise.resolve(new StoredSourceFile(
      new StringValueObject(`${projectId.valueOf()}.source`),
      file.size,
      new StringValueObject(file.type)
    ));
  }
  public find(projectId: ProjectId): Promise<Blob | null> {
    return Promise.resolve(this.files.get(projectId.valueOf()) ?? null);
  }
  public delete(projectId: ProjectId): Promise<void> {
    this.files.delete(projectId.valueOf());
    return Promise.resolve();
  }
}
