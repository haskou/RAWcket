import type { RecipePreset } from '../../domain/RecipePreset';
import { RecipePresetRepository } from '../../domain/repositories/RecipePresetRepository';
import type { RecipePresetId } from '../../domain/value-objects/RecipePresetId';

export class InMemoryRecipePresetRepository extends RecipePresetRepository {
  private presets: RecipePreset[] = [];
  public async findAll(): Promise<RecipePreset[]> { return Promise.resolve([...this.presets].reverse()); }
  public async save(preset: RecipePreset): Promise<void> {
    this.presets = [...this.presets.filter((candidate) => !candidate.isIdentifiedBy(preset.getId())), preset];
    return Promise.resolve();
  }
  public async delete(id: RecipePresetId): Promise<void> {
    this.presets = this.presets.filter((preset) => !preset.isIdentifiedBy(id));
    return Promise.resolve();
  }
}
