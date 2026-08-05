import { RecipePresetId } from '../../../domain/value-objects/RecipePresetId';

export class DeleteRecipePresetMessage {
  private readonly presetId: RecipePresetId;
  public constructor(presetId: string) { this.presetId = new RecipePresetId(presetId); }
  public getPresetId(): RecipePresetId { return this.presetId; }
}
