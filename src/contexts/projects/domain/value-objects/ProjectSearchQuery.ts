import { StringValueObject } from '@haskou/value-objects';

export class ProjectSearchQuery extends StringValueObject {
  private static readonly MAX_LENGTH = 80;

  public constructor(value: string | StringValueObject) {
    super(typeof value === 'string' ? value.trim().toLocaleLowerCase() : value, ProjectSearchQuery.MAX_LENGTH);
  }

  public matches(...candidates: StringValueObject[]): boolean {
    if (this.isEmpty()) return true;
    return candidates.some((candidate) => candidate.valueOf().toLocaleLowerCase().includes(this.valueOf()));
  }
}
