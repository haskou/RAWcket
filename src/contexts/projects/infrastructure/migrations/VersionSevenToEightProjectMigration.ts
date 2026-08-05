import { z } from 'zod';
import type { ProjectMigration } from './ProjectMigration';

const pointSchema = z.looseObject({ x: z.number(), y: z.number() });
const strokeSchema = z.looseObject({ points: z.array(pointSchema) });
const shapeSchema = z.looseObject({ kind: z.string() });
const maskSchema = z.looseObject({ shape: shapeSchema });
const recipeSchema = z.looseObject({ masks: z.array(maskSchema) });
const operationSchema = z.looseObject({ kind: z.string() });
const historyEntrySchema = z.looseObject({ operation: operationSchema, inverse: operationSchema });
const versionSevenSchema = z.looseObject({
  schemaVersion: z.literal(7),
  recipe: recipeSchema,
  history: z.looseObject({ undo: z.array(historyEntrySchema), redo: z.array(historyEntrySchema) })
});

export class VersionSevenToEightProjectMigration implements ProjectMigration {
  public readonly from = 7;
  public readonly to = 8;

  public migrate(input: unknown): unknown {
    const project = versionSevenSchema.parse(input);
    return {
      ...project,
      schemaVersion: 8,
      recipe: this.migrateRecipe(project.recipe),
      history: {
        ...project.history,
        undo: project.history.undo.map((entry) => this.migrateHistoryEntry(entry)),
        redo: project.history.redo.map((entry) => this.migrateHistoryEntry(entry))
      }
    };
  }

  private migrateHistoryEntry(entry: z.infer<typeof historyEntrySchema>): unknown {
    return { ...entry, operation: this.migrateOperation(entry.operation), inverse: this.migrateOperation(entry.inverse) };
  }

  private migrateOperation(input: z.infer<typeof operationSchema>): unknown {
    const operation = operationSchema.parse(input);
    if (operation.kind === 'add-mask' || operation.kind === 'update-mask') {
      return { ...operation, mask: this.migrateMask(maskSchema.parse(operation.mask)) };
    }
    if (operation.kind === 'replace-recipe') {
      return { ...operation, recipe: this.migrateRecipe(recipeSchema.parse(operation.recipe)) };
    }
    return operation;
  }

  private migrateRecipe(recipe: z.infer<typeof recipeSchema>): unknown {
    return { ...recipe, masks: recipe.masks.map((mask) => this.migrateMask(mask)) };
  }

  private migrateMask(mask: z.infer<typeof maskSchema>): unknown {
    return { ...mask, expansion: 0, shape: this.migrateShape(mask.shape) };
  }

  private migrateShape(shape: z.infer<typeof shapeSchema>): unknown {
    if (shape.kind === 'brush') {
      const strokes = z.array(strokeSchema).parse(shape.strokes);
      return {
        ...shape,
        strokes: strokes.map((stroke) => ({
          ...stroke,
          mode: 'add',
          points: stroke.points.map((point) => ({ ...point, pressure: 1 }))
        }))
      };
    }
    if (shape.kind === 'composite') {
      const children = z.array(maskSchema).parse(shape.children);
      return { ...shape, children: children.map((child) => this.migrateMask(child)) };
    }
    return shape;
  }
}
