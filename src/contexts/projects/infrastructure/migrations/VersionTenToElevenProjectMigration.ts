import { z } from 'zod';
import { CurveSet } from '../../domain/ToneCurve';
import type { ProjectMigration } from './ProjectMigration';

const shapeSchema = z.looseObject({ kind: z.string() });
const maskSchema = z.looseObject({ shape: shapeSchema });
const recipeSchema = z.looseObject({ masks: z.array(maskSchema) });
const operationSchema = z.looseObject({ kind: z.string() });
const historyEntrySchema = z.looseObject({ operation: operationSchema, inverse: operationSchema });
const adviceSchema = z.looseObject({ operations: z.array(operationSchema) });
const versionTenSchema = z.looseObject({
  schemaVersion: z.literal(10),
  recipe: recipeSchema,
  history: z.looseObject({ undo: z.array(historyEntrySchema), redo: z.array(historyEntrySchema) }),
  aiDevelopment: z.looseObject({ advice: z.array(adviceSchema) })
});

export class VersionTenToElevenProjectMigration implements ProjectMigration {
  public readonly from = 10;
  public readonly to = 11;

  public migrate(input: unknown): unknown {
    const project = versionTenSchema.parse(input);
    return {
      ...project,
      schemaVersion: 11,
      recipe: this.migrateRecipe(project.recipe),
      history: {
        ...project.history,
        undo: project.history.undo.map((entry) => this.migrateHistoryEntry(entry)),
        redo: project.history.redo.map((entry) => this.migrateHistoryEntry(entry))
      },
      aiDevelopment: {
        ...project.aiDevelopment,
        advice: project.aiDevelopment.advice.map((advice) => ({
          ...advice,
          operations: advice.operations.map((operation) => this.migrateOperation(operation))
        }))
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
    return {
      ...mask,
      localCurves: CurveSet.identity().toPrimitives(),
      shape: mask.shape.kind === 'composite'
        ? { ...mask.shape, children: z.array(maskSchema).parse(mask.shape.children).map((child) => this.migrateMask(child)) }
        : mask.shape
    };
  }
}
