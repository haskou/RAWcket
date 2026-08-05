import type { DevelopmentRecipePrimitives } from '../../domain/DevelopmentRecipe';
import type { RecipePreset } from '../../domain/RecipePreset';

export type ImportedRecipePreset = { name: string; recipe: DevelopmentRecipePrimitives };

export abstract class RecipePresetCodec {
  public abstract encode(preset: RecipePreset): Blob;
  public abstract decode(file: File): Promise<ImportedRecipePreset>;
}
