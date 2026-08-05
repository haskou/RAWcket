import type { StringValueObject } from '@haskou/value-objects';

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
  }

  public getFileName(): StringValueObject {
    return this.fileName;
  }

  public getMimeType(): StringValueObject {
    return this.mimeType;
  }

  public getSize(): number {
    return this.size;
  }

  public getStorageKey(): StringValueObject {
    return this.storageKey;
  }
}
