import { ProjectId } from '../../../domain/value-objects/ProjectId';
import { RecipePresetId } from '../../../domain/value-objects/RecipePresetId';
import { RecipePresetName } from '../../../domain/value-objects/RecipePresetName';

export class CreateRecipePresetMessage {
  private readonly projectId: ProjectId;
  private readonly presetId: RecipePresetId;
  private readonly name: RecipePresetName;

  public constructor(projectId: string, presetId: string, name: string, private readonly occurredAt = Date.now()) {
    this.projectId = new ProjectId(projectId);
    this.presetId = new RecipePresetId(presetId);
    this.name = new RecipePresetName(name);
  }
  public getProjectId(): ProjectId { return this.projectId; }
  public getPresetId(): RecipePresetId { return this.presetId; }
  public getName(): RecipePresetName { return this.name; }
  public getOccurredAt(): number { return this.occurredAt; }
}
