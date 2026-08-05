import { Integer } from '@haskou/value-objects';

export class ProjectSchemaVersion extends Integer {
  public static readonly CURRENT = 1;
  public constructor(value: number) {
    super(value);
    if (this.isLessThan(0)) throw new Error('La version de esquema no puede ser negativa.');
  }
  public isCurrent(): boolean {
    return this.isEqual(new ProjectSchemaVersion(ProjectSchemaVersion.CURRENT));
  }
}
