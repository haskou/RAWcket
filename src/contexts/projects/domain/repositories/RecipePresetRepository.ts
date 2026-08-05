import type { RecipePreset } from '../RecipePreset';
import type { RecipePresetId } from '../value-objects/RecipePresetId';

export abstract class RecipePresetRepository {
  public abstract findAll(): Promise<RecipePreset[]>;
  public abstract save(preset: RecipePreset): Promise<void>;
  public abstract delete(id: RecipePresetId): Promise<void>;
}
