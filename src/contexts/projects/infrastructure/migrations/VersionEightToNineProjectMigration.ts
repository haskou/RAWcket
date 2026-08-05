import { z } from 'zod';
import type { ProjectMigration } from './ProjectMigration';

const versionEightSchema = z.looseObject({ schemaVersion: z.literal(8) });

export class VersionEightToNineProjectMigration implements ProjectMigration {
  public readonly from = 8;
  public readonly to = 9;

  public migrate(input: unknown): unknown {
    const project = versionEightSchema.parse(input);
    return { ...project, schemaVersion: 9, aiDevelopment: { advice: [] } };
  }
}
