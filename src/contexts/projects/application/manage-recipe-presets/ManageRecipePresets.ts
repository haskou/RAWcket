import { Timestamp } from '@haskou/value-objects';
import { DevelopmentRecipe } from '../../domain/DevelopmentRecipe';
import type { PhotoProject } from '../../domain/PhotoProject';
import { RecipePreset } from '../../domain/RecipePreset';
import type { RecipePresetRepository } from '../../domain/repositories/RecipePresetRepository';
import { RecipePresetName } from '../../domain/value-objects/RecipePresetName';
import type { RecipePresetCodec } from '../ports/RecipePresetCodec';
import type { CreateRecipePresetMessage } from './messages/CreateRecipePresetMessage';
import type { DeleteRecipePresetMessage } from './messages/DeleteRecipePresetMessage';
import type { ExportRecipePresetMessage, ImportRecipePresetMessage } from './messages/TransferRecipePresetMessage';
import type { UpdateRecipePresetMessage } from './messages/UpdateRecipePresetMessage';

export class ManageRecipePresets {
  public constructor(private readonly presets: RecipePresetRepository, private readonly codec: RecipePresetCodec) {}

  public list(): Promise<RecipePreset[]> { return this.presets.findAll(); }

  public async create(project: PhotoProject, message: CreateRecipePresetMessage): Promise<RecipePreset> {
    if (!project.isIdentifiedBy(message.getProjectId())) throw new Error('The recipe preset belongs to a different project.');
    const preset = RecipePreset.create(message.getPresetId(), message.getName(), project.getRecipe(), Timestamp.new(message.getOccurredAt()));
    await this.presets.save(preset);
    return preset;
  }

  public async update(project: PhotoProject, preset: RecipePreset, message: UpdateRecipePresetMessage): Promise<RecipePreset> {
    if (!project.isIdentifiedBy(message.getProjectId()) || !preset.isIdentifiedBy(message.getPresetId())) throw new Error('The recipe preset update targets a different resource.');
    const recipe = message.shouldReplaceRecipe() ? project.getRecipe() : preset.getRecipe();
    preset.revise(message.getName(), recipe, Timestamp.new(message.getOccurredAt()));
    await this.presets.save(preset);
    return preset;
  }

  public remove(message: DeleteRecipePresetMessage): Promise<void> { return this.presets.delete(message.getPresetId()); }

  public async import(message: ImportRecipePresetMessage): Promise<RecipePreset> {
    const decoded = await this.codec.decode(message.getFile());
    const preset = RecipePreset.create(message.getPresetId(), new RecipePresetName(decoded.name), DevelopmentRecipe.fromPrimitives(decoded.recipe), Timestamp.new(message.getOccurredAt()));
    await this.presets.save(preset);
    return preset;
  }

  public export(preset: RecipePreset, message: ExportRecipePresetMessage): Blob {
    if (!preset.isIdentifiedBy(message.getPresetId())) throw new Error('The recipe preset export targets a different preset.');
    return this.codec.encode(preset);
  }
}
