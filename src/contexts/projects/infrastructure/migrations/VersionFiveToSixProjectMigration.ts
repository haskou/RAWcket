import { z } from 'zod';
import type { ProjectMigration } from './ProjectMigration';

const versionFiveSchema = z.looseObject({
  schemaVersion: z.literal(5),
  organization: z.looseObject({ rating: z.number(), tags: z.array(z.string()) })
});

export class VersionFiveToSixProjectMigration implements ProjectMigration {
  public readonly from = 5;
  public readonly to = 6;
  public migrate(input: unknown): unknown {
    const project = versionFiveSchema.parse(input);
    return { ...project, schemaVersion: 6, organization: { ...project.organization, favorite: false } };
  }
}
