import { StringValueObject } from '@haskou/value-objects';

export class ProjectTag extends StringValueObject {
  private static readonly MAX_LENGTH = 32;

  public constructor(value: string | StringValueObject) {
    const normalized = typeof value === 'string' ? value.trim().toLocaleLowerCase() : value;
    super(normalized, ProjectTag.MAX_LENGTH);
    if (this.isEmpty()) throw new Error('A project tag cannot be empty.');
    if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(this.valueOf())) {
      throw new Error('A project tag may contain letters, numbers, spaces, underscores, and hyphens.');
    }
  }
}
