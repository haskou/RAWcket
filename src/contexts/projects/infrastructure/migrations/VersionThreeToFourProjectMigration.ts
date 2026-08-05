import { z } from 'zod';
import type { ProjectMigration } from './ProjectMigration';

const versionThreeSchema = z.looseObject({ schemaVersion: z.literal(3) });

export class VersionThreeToFourProjectMigration implements ProjectMigration {
  public readonly from = 3;
  public readonly to = 4;

  public migrate(input: unknown): unknown {
    const project = versionThreeSchema.parse(input);
    return {
      ...project,
      schemaVersion: 4,
      organization: { rating: 0, tags: [] }
    };
  }
}
