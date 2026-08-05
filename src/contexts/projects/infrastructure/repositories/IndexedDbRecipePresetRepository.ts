import type { RawcketDatabaseConnection } from '@/shared/infrastructure/database/RawcketDatabase';
import { RecipePreset } from '../../domain/RecipePreset';
import { RecipePresetRepository } from '../../domain/repositories/RecipePresetRepository';
import type { RecipePresetId } from '../../domain/value-objects/RecipePresetId';
import { developmentRecipeSchema } from '../serialization/ProjectSchemas';
import { z } from 'zod';

const recipePresetRecordSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(80),
  recipe: developmentRecipeSchema,
  createdAt: z.number().finite(),
  updatedAt: z.number().finite()
});

export class IndexedDbRecipePresetRepository extends RecipePresetRepository {
  public constructor(private readonly database: Promise<RawcketDatabaseConnection>) { super(); }

  public async findAll(): Promise<RecipePreset[]> {
    const records = await (await this.database).getAllFromIndex('recipePresets', 'by-updatedAt');
    return records.reverse().map((record) => RecipePreset.fromPrimitives(recipePresetRecordSchema.parse(record)));
  }

  public async save(preset: RecipePreset): Promise<void> {
    await (await this.database).put('recipePresets', preset.toPrimitives());
  }

  public async delete(id: RecipePresetId): Promise<void> {
    await (await this.database).delete('recipePresets', id.valueOf());
  }
}
