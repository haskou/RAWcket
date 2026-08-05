import { RecipePresetId } from '../../../domain/value-objects/RecipePresetId';

export class ImportRecipePresetMessage {
  private static readonly MAX_BYTES = 5 * 1024 * 1024;
  private readonly presetId: RecipePresetId;
  public constructor(presetId: string, private readonly file: File, private readonly occurredAt = Date.now()) {
    this.presetId = new RecipePresetId(presetId);
    if (file.size > ImportRecipePresetMessage.MAX_BYTES) throw new Error('Recipe preset files are limited to 5 MB.');
  }
  public getPresetId(): RecipePresetId { return this.presetId; }
  public getFile(): File { return this.file; }
  public getOccurredAt(): number { return this.occurredAt; }
}

export class ExportRecipePresetMessage {
  private readonly presetId: RecipePresetId;
  public constructor(presetId: string) { this.presetId = new RecipePresetId(presetId); }
  public getPresetId(): RecipePresetId { return this.presetId; }
}
