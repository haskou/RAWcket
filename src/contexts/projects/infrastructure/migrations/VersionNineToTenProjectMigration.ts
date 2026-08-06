import { z } from 'zod';
import type { ProjectMigration } from './ProjectMigration';

const versionNineSchema = z.looseObject({ schemaVersion: z.literal(9) });

export class VersionNineToTenProjectMigration implements ProjectMigration {
  public readonly from = 9;
  public readonly to = 10;

  public migrate(input: unknown): unknown {
    const project = versionNineSchema.parse(input);
    return { ...project, schemaVersion: 10 };
  }
}
