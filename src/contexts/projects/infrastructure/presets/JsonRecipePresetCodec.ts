import { z } from 'zod';
import type { RecipePresetCodec, ImportedRecipePreset } from '../../application/ports/RecipePresetCodec';
import type { RecipePreset } from '../../domain/RecipePreset';
import { developmentRecipeSchema } from '../serialization/ProjectSchemas';

const recipePresetFileSchema = z.object({
  format: z.literal('rawcket-recipe-preset'),
  formatVersion: z.literal(1),
  name: z.string().min(1).max(80),
  recipe: developmentRecipeSchema
});

export class JsonRecipePresetCodec implements RecipePresetCodec {
  public encode(preset: RecipePreset): Blob {
    const primitives = preset.toPrimitives();
    return new Blob([JSON.stringify({ format: 'rawcket-recipe-preset', formatVersion: 1, name: primitives.name, recipe: primitives.recipe }, null, 2)], { type: 'application/json' });
  }

  public async decode(file: File): Promise<ImportedRecipePreset> {
    try {
      const parsed: unknown = JSON.parse(await this.readText(file));
      const decoded = recipePresetFileSchema.parse(parsed);
      return { name: decoded.name, recipe: decoded.recipe };
    } catch (error: unknown) {
      if (error instanceof SyntaxError || error instanceof z.ZodError) throw new Error('The file is not a valid RAWcket recipe preset.');
      throw error;
    }
  }

  private readText(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The RAWcket recipe preset could not be read.'));
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The RAWcket recipe preset does not contain text.'));
      reader.readAsText(file);
    });
  }
}
