import { Integer } from '@haskou/value-objects';

export class PreviewSize extends Integer {
  public static readonly THUMBNAIL = new PreviewSize(512);
  public static readonly INTERACTIVE = new PreviewSize(2560);

  public constructor(value: number) {
    super(value);
    if (this.isLessThan(64) || this.isGreaterThan(4096)) {
      throw new Error('El borde de preview debe estar entre 64 y 4096 pixeles.');
    }
  }
}
