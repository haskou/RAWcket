import { StringValueObject } from '@haskou/value-objects';

export class RecipePresetName extends StringValueObject {
  private static readonly MAX_LENGTH = 80;

  public constructor(value: string | StringValueObject) {
    super(typeof value === 'string' ? value.trim() : value, RecipePresetName.MAX_LENGTH);
    if (this.isEmpty()) throw new Error('A recipe preset name cannot be empty.');
  }
}
