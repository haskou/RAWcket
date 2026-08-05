import { z } from 'zod';
import type { ProjectMigration } from './ProjectMigration';

const versionOneSchema = z.looseObject({
  schemaVersion: z.literal(1),
  recipe: z.looseObject({})
});

export class VersionOneToTwoProjectMigration implements ProjectMigration {
  public readonly from = 1;
  public readonly to = 2;

  public migrate(input: unknown): unknown {
    const project = versionOneSchema.parse(input);
    return {
      ...project,
      schemaVersion: 2,
      recipe: { ...project.recipe, disabledGlobalAdjustments: [] }
    };
  }
}
