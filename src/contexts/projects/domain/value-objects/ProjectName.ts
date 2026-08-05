import { StringValueObject } from '@haskou/value-objects';

export class ProjectName extends StringValueObject {
  private static readonly MAX_LENGTH = 120;

  public constructor(value: string | StringValueObject) {
    const normalized = typeof value === 'string' ? value.trim() : value;
    super(normalized, ProjectName.MAX_LENGTH);
    if (this.isEmpty()) {
      throw new Error('El nombre del proyecto no puede estar vacio.');
    }
  }

  public copy(): ProjectName {
    return new ProjectName(`${this.valueOf()} (copia)`);
  }
}
