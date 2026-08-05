import { StringValueObject } from '@haskou/value-objects';
import { StoredSourceFile } from '../../domain/StoredSourceFile';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import type { ProjectId } from '../../domain/value-objects/ProjectId';
import type { RawcketDatabaseConnection } from '../../../../shared/infrastructure/database/RawcketDatabase';

export class BrowserSourceFileRepository implements SourceFileRepository {
  public constructor(private readonly database: Promise<RawcketDatabaseConnection>) {}

  public async save(projectId: ProjectId, file: Blob): Promise<StoredSourceFile> {
    const key = `${projectId.valueOf()}.source`;
    const root = await this.getOpfsRoot();
    if (root === null) {
      await (await this.database).put('sources', file, projectId.valueOf());
    } else {
      const handle = await root.getFileHandle(key, { create: true });
      const writable = await handle.createWritable();
      await writable.write(file);
      await writable.close();
    }
    return new StoredSourceFile(new StringValueObject(key), file.size, new StringValueObject(file.type));
  }

  public async find(projectId: ProjectId): Promise<Blob | null> {
    const root = await this.getOpfsRoot();
    if (root === null) return (await (await this.database).get('sources', projectId.valueOf())) ?? null;
    try {
      return await (await root.getFileHandle(`${projectId.valueOf()}.source`)).getFile();
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'NotFoundError') return null;
      throw error;
    }
  }

  public async delete(projectId: ProjectId): Promise<void> {
    const root = await this.getOpfsRoot();
    if (root === null) {
      await (await this.database).delete('sources', projectId.valueOf());
      return;
    }
    try {
      await root.removeEntry(`${projectId.valueOf()}.source`);
    } catch (error: unknown) {
      if (!(error instanceof DOMException) || error.name !== 'NotFoundError') throw error;
    }
  }

  private async getOpfsRoot(): Promise<FileSystemDirectoryHandle | null> {
    if (typeof navigator === 'undefined') return null;
    const storage = Reflect.get(navigator, 'storage') as StorageManager | undefined;
    if (storage === undefined || typeof storage.getDirectory !== 'function') return null;
    return storage.getDirectory();
  }
}
