import { Integer } from '@haskou/value-objects';

export class ProjectSchemaVersion extends Integer {
  public static readonly CURRENT = 3;
  public constructor(value: number) {
    super(value);
    if (this.isLessThan(0)) throw new Error('The schema version cannot be negative.');
  }
  public isCurrent(): boolean {
    return this.isEqual(new ProjectSchemaVersion(ProjectSchemaVersion.CURRENT));
  }
}
