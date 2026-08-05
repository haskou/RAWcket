import { StringValueObject, Timestamp } from '@haskou/value-objects';
import { PhotoProject, type PhotoProjectPrimitives } from '../../domain/PhotoProject';
import { PhotoProjectSummary } from '../../domain/PhotoProjectSummary';
import type { ProjectRepository } from '../../domain/repositories/ProjectRepository';
import { ProjectName } from '../../domain/value-objects/ProjectName';
import { ProjectId } from '../../domain/value-objects/ProjectId';
import type { RawcketDatabaseConnection } from '../../../../shared/infrastructure/database/RawcketDatabase';
import { photoProjectSchema } from '../serialization/ProjectSchemas';
import type { ProjectMigrator } from '../migrations/ProjectMigrator';

export class IndexedDbProjectRepository implements ProjectRepository {
  public constructor(
    private readonly database: Promise<RawcketDatabaseConnection>,
    private readonly migrator: ProjectMigrator
  ) {}

  public async findById(id: ProjectId): Promise<PhotoProject | null> {
    const raw = await (await this.database).get('projects', id.valueOf());
    if (raw === undefined) return null;
    const migrated = this.migrator.migrate(raw);
    const parsed = photoProjectSchema.parse(migrated) as PhotoProjectPrimitives;
    return PhotoProject.fromPrimitives(parsed);
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
    const transaction = database.transaction(['projects', 'projectIndex'], 'readwrite');
    await Promise.all([
      transaction.objectStore('projects').put(primitives, primitives.id),
      transaction.objectStore('projectIndex').put({
        id: primitives.id,
        name: primitives.name,
        updatedAt: primitives.metadata.updatedAt,
        sourceMimeType: primitives.source.mimeType
      }),
      transaction.done
    ]);
  }

  public async delete(id: ProjectId): Promise<void> {
    const database = await this.database;
    const transaction = database.transaction(['projects', 'projectIndex'], 'readwrite');
    await Promise.all([
      transaction.objectStore('projects').delete(id.valueOf()),
      transaction.objectStore('projectIndex').delete(id.valueOf()),
      transaction.done
    ]);
  }
}
