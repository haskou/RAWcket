import { StringValueObject, Timestamp } from '@haskou/value-objects';
import { PhotoProject } from '../../domain/PhotoProject';
import { PhotoProjectSummary } from '../../domain/PhotoProjectSummary';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import { ProjectName } from '../../domain/value-objects/ProjectName';
import { ProjectId } from '../../domain/value-objects/ProjectId';
import type { RawcketDatabaseConnection } from '../../../../shared/infrastructure/database/RawcketDatabase';
import { photoProjectSchema } from '../serialization/ProjectSchemas';
import type { ProjectMigrator } from '../migrations/ProjectMigrator';

export class IndexedDbProjectRepository implements ProjectRepository {
  private static readonly SNAPSHOT_LIMIT = 5;
  public constructor(
    private readonly database: Promise<RawcketDatabaseConnection>,
    private readonly migrator: ProjectMigrator
  ) {}

  public async findById(id: ProjectId): Promise<PhotoProject | null> {
    const database = await this.database;
    const raw = await database.get('projects', id.valueOf());
    if (raw === undefined) return null;
    try {
      return this.hydrate(raw);
    } catch (error: unknown) {
      const recovered = await this.recoverSnapshot(database, id);
      if (recovered !== null) return recovered;
      throw error;
    }
  }

  public async findAll(): Promise<PhotoProjectSummary[]> {
    const records = await (await this.database).getAllFromIndex('projectIndex', 'by-updatedAt');
    return records.reverse().map((record) => new PhotoProjectSummary(
      new ProjectId(record.id),
      new ProjectName(record.name),
      Timestamp.new(record.updatedAt),
      new StringValueObject(record.sourceMimeType)
    ));
  }

  public async save(project: PhotoProject): Promise<void> {
    const primitives = project.toPrimitives();
    photoProjectSchema.parse(primitives);
    const database = await this.database;
    const previous = await database.get('projects', primitives.id);
    const snapshot = previous === undefined ? null : {
      projectId: primitives.id,
      createdAt: await this.nextSnapshotCreatedAt(database, project.getId()),
      project: previous,
      sha256: await this.sha256(previous)
    };
    const transaction = database.transaction(['projects', 'projectIndex', 'projectSnapshots'], 'readwrite');
    const writes: Array<Promise<unknown>> = [
      transaction.objectStore('projects').put(primitives, primitives.id),
      transaction.objectStore('projectIndex').put({
        id: primitives.id,
        name: primitives.name,
        updatedAt: primitives.metadata.updatedAt,
        sourceMimeType: primitives.source.mimeType
      })
    ];
    if (snapshot !== null) writes.push(transaction.objectStore('projectSnapshots').put(snapshot));
    await Promise.all([
      ...writes,
      transaction.done
    ]);
    await this.trimSnapshots(database, project.getId());
  }

  public async delete(id: ProjectId): Promise<void> {
    const database = await this.database;
    const snapshotKeys = await database.getAllKeysFromIndex('projectSnapshots', 'by-project', id.valueOf());
    const transaction = database.transaction(['projects', 'projectIndex', 'projectSnapshots'], 'readwrite');
    await Promise.all([
      transaction.objectStore('projects').delete(id.valueOf()),
      transaction.objectStore('projectIndex').delete(id.valueOf()),
      ...snapshotKeys.map((key) => transaction.objectStore('projectSnapshots').delete(key)),
      transaction.done
    ]);
  }

  private hydrate(raw: unknown): PhotoProject {
    const migrated = this.migrator.migrate(raw);
    return PhotoProject.fromPrimitives(photoProjectSchema.parse(migrated));
  }

  private async recoverSnapshot(database: RawcketDatabaseConnection, id: ProjectId): Promise<PhotoProject | null> {
    const snapshots = await database.getAllFromIndex('projectSnapshots', 'by-project', id.valueOf());
    snapshots.sort((left, right) => right.createdAt - left.createdAt);
    for (const snapshot of snapshots) {
      if (await this.sha256(snapshot.project) !== snapshot.sha256) continue;
      try {
        return this.hydrate(snapshot.project);
      } catch {
        continue;
      }
    }
    return null;
  }

  private async trimSnapshots(database: RawcketDatabaseConnection, id: ProjectId): Promise<void> {
    const snapshots = await database.getAllFromIndex('projectSnapshots', 'by-project', id.valueOf());
    const obsolete = snapshots.sort((left, right) => right.createdAt - left.createdAt).slice(IndexedDbProjectRepository.SNAPSHOT_LIMIT);
    if (obsolete.length === 0) return;
    const transaction = database.transaction('projectSnapshots', 'readwrite');
    await Promise.all([
      ...obsolete.map((snapshot) => transaction.store.delete([snapshot.projectId, snapshot.createdAt])),
      transaction.done
    ]);
  }

  private async nextSnapshotCreatedAt(database: RawcketDatabaseConnection, id: ProjectId): Promise<number> {
    const snapshots = await database.getAllFromIndex('projectSnapshots', 'by-project', id.valueOf());
    const newestCreatedAt = snapshots.reduce((newest, snapshot) => Math.max(newest, snapshot.createdAt), 0);
    return Math.max(Date.now(), newestCreatedAt + 1);
  }

  private async sha256(value: unknown): Promise<string> {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('');
  }
}
