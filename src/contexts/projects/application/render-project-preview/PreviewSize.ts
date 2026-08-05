import { Integer } from '@haskou/value-objects';

export class PreviewSize extends Integer {
  public static readonly THUMBNAIL = new PreviewSize(512);
  public static readonly INTERACTIVE = new PreviewSize(2560);

  public constructor(value: number) {
    super(value);
    if (this.isLessThan(64) || this.isGreaterThan(4096)) {
      throw new Error('The preview edge must be between 64 and 4096 pixels.');
    }
  }
}
