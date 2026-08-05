import { z } from 'zod';
import type { ProjectMigration } from './ProjectMigration';

const versionTwoSchema = z.looseObject({
  schemaVersion: z.literal(2),
  recipe: z.looseObject({
    globalAdjustments: z.looseObject({})
  })
});

export class VersionTwoToThreeProjectMigration implements ProjectMigration {
  public readonly from = 2;
  public readonly to = 3;

  public migrate(input: unknown): unknown {
    const project = versionTwoSchema.parse(input);
    return {
      ...project,
      schemaVersion: 3,
      recipe: {
        ...project.recipe,
        globalAdjustments: {
          ...project.recipe.globalAdjustments,
          texture: 0,
          vignette: 0
        }
      }
    };
  }
}
