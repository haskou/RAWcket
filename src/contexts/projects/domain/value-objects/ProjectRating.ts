import { Integer } from '@haskou/value-objects';

export class ProjectRating extends Integer {
  public static readonly UNRATED = new ProjectRating(0);

  public constructor(value: number | Integer) {
    super(value);
    if (this.isLessThan(0) || this.isGreaterThan(5)) {
      throw new Error('A project rating must be between 0 and 5 stars.');
    }
  }
}
