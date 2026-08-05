import type { StringValueObject } from '@haskou/value-objects';

export type SourceImageMimeType = 'image/jpeg' | 'image/png' | 'image/x-sony-arw';

export class SourceImageReference {
  public constructor(
    private readonly fileName: StringValueObject,
    private readonly mimeType: StringValueObject,
    private readonly size: number,
    private readonly storageKey: StringValueObject
  ) {
    if (!Number.isSafeInteger(size) || size <= 0) {
      throw new Error('The original image must have a valid size.');
    }
    this.getSupportedMimeType();
  }

  public getFileName(): StringValueObject {
    return this.fileName;
  }

  public getMimeType(): StringValueObject {
    return this.mimeType;
  }

  public getSupportedMimeType(): SourceImageMimeType {
    const value = this.mimeType.valueOf();
    if (value === 'image/jpeg' || value === 'image/png' || value === 'image/x-sony-arw') return value;
    throw new Error(`The source image MIME type ${value} is not supported.`);
  }

  public getSize(): number {
    return this.size;
  }

  public getStorageKey(): StringValueObject {
    return this.storageKey;
  }
}
