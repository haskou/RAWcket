import { Timestamp } from '@haskou/value-objects';
import { DevelopmentRecipe, type DevelopmentRecipePrimitives } from './DevelopmentRecipe';
import { RecipePresetId } from './value-objects/RecipePresetId';
import { RecipePresetName } from './value-objects/RecipePresetName';

export type RecipePresetPrimitives = {
  id: string;
  name: string;
  recipe: DevelopmentRecipePrimitives;
  createdAt: number;
  updatedAt: number;
};

export type RecipePresetDomainEvent = {
  name: 'RecipePresetWasCreated' | 'RecipePresetWasChanged';
  presetId: string;
  occurredAt: number;
};

export class RecipePreset {
  private events: RecipePresetDomainEvent[] = [];

  private constructor(
    private readonly id: RecipePresetId,
    private name: RecipePresetName,
    private recipe: DevelopmentRecipe,
    private readonly createdAt: Timestamp,
    private updatedAt: Timestamp
  ) {}

  public static create(id: RecipePresetId, name: RecipePresetName, recipe: DevelopmentRecipe, at: Timestamp): RecipePreset {
    const preset = new RecipePreset(id, name, recipe, at, at);
    preset.recordEvent('RecipePresetWasCreated', at);
    return preset;
  }

  public static fromPrimitives(input: RecipePresetPrimitives): RecipePreset {
    return new RecipePreset(
      new RecipePresetId(input.id),
      new RecipePresetName(input.name),
      DevelopmentRecipe.fromPrimitives(input.recipe),
      Timestamp.new(input.createdAt),
      Timestamp.new(input.updatedAt)
    );
  }

  public isIdentifiedBy(id: RecipePresetId): boolean {
    return this.id.isEqual(id);
  }

  public revise(name: RecipePresetName, recipe: DevelopmentRecipe, at: Timestamp): void {
    this.name = name;
    this.recipe = recipe;
    this.updatedAt = at;
    this.recordEvent('RecipePresetWasChanged', at);
  }

  public getId(): RecipePresetId { return this.id; }
  public getName(): RecipePresetName { return this.name; }
  public getRecipe(): DevelopmentRecipe { return DevelopmentRecipe.fromPrimitives(this.recipe.toPrimitives()); }

  public pullDomainEvents(): RecipePresetDomainEvent[] {
    const events = [...this.events];
    this.events = [];
    return events;
  }

  public toPrimitives(): RecipePresetPrimitives {
    return {
      id: this.id.valueOf(),
      name: this.name.valueOf(),
      recipe: this.recipe.toPrimitives(),
      createdAt: this.createdAt.toMilliseconds(),
      updatedAt: this.updatedAt.toMilliseconds()
    };
  }

  private recordEvent(name: RecipePresetDomainEvent['name'], at: Timestamp): void {
    this.events.push({ name, presetId: this.id.valueOf(), occurredAt: at.toMilliseconds() });
  }
}
