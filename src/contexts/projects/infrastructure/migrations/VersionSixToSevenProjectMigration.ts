import { z } from 'zod';
import type { ProjectMigration } from './ProjectMigration';

const viewportSchema = z.looseObject({});
const recipeSchema = z.looseObject({ viewport: viewportSchema });
const operationSchema = z.looseObject({ kind: z.string() });
const historyEntrySchema = z.looseObject({ operation: operationSchema, inverse: operationSchema });
const versionSixSchema = z.looseObject({
  schemaVersion: z.literal(6),
  recipe: recipeSchema,
  history: z.looseObject({ undo: z.array(historyEntrySchema), redo: z.array(historyEntrySchema) })
});

export class VersionSixToSevenProjectMigration implements ProjectMigration {
  public readonly from = 6;
  public readonly to = 7;

  public migrate(input: unknown): unknown {
    const project = versionSixSchema.parse(input);
    return {
      ...project,
      schemaVersion: 7,
      recipe: this.migrateRecipe(project.recipe),
      history: {
        ...project.history,
        undo: project.history.undo.map((entry) => this.migrateHistoryEntry(entry)),
        redo: project.history.redo.map((entry) => this.migrateHistoryEntry(entry))
      }
    };
  }

  private migrateHistoryEntry(entry: z.infer<typeof historyEntrySchema>): unknown {
    return {
      ...entry,
      operation: this.migrateOperation(entry.operation),
      inverse: this.migrateOperation(entry.inverse)
    };
  }

  private migrateOperation(input: z.infer<typeof operationSchema>): unknown {
    const operation = operationSchema.parse(input);
    if (operation.kind === 'set-viewport-transform') {
      return { ...operation, viewport: this.migrateViewport(viewportSchema.parse(operation.viewport)) };
    }
    if (operation.kind === 'replace-recipe') {
      return { ...operation, recipe: this.migrateRecipe(recipeSchema.parse(operation.recipe)) };
    }
    return operation;
  }

  private migrateRecipe(recipe: z.infer<typeof recipeSchema>): unknown {
    return { ...recipe, viewport: this.migrateViewport(recipe.viewport) };
  }

  private migrateViewport(viewport: z.infer<typeof viewportSchema>): unknown {
    return { ...viewport, horizontalPerspective: 0, verticalPerspective: 0 };
  }
}
