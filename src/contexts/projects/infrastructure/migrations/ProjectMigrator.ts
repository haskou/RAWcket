import { z } from 'zod';
import { ProjectSchemaVersion } from '../../domain/ProjectSchemaVersion';
import type { ProjectMigration } from './ProjectMigration';

const versionedSchema = z.object({ schemaVersion: z.int().nonnegative() });

export class ProjectMigrator {
  public constructor(private readonly migrations: readonly ProjectMigration[]) {}

  public migrate(input: unknown): unknown {
    let current: unknown = input;
    let version = versionedSchema.parse(current).schemaVersion;
    if (version > ProjectSchemaVersion.CURRENT) {
      throw new Error(`El proyecto usa un esquema futuro no compatible (${version}).`);
    }
    while (version < ProjectSchemaVersion.CURRENT) {
      const migration = this.migrations.find((candidate) => candidate.from === version);
      if (migration === undefined || migration.to <= version) {
        throw new Error(`No existe una migracion segura desde el esquema ${version}.`);
      }
      current = migration.migrate(current);
      version = versionedSchema.parse(current).schemaVersion;
    }
    return current;
  }
}
