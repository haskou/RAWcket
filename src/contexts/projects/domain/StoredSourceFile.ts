import type { StringValueObject } from '@haskou/value-objects';

export class StoredSourceFile {
  public constructor(
    private readonly storageKey: StringValueObject,
    private readonly size: number,
    private readonly mimeType: StringValueObject
  ) {}
  public getStorageKey(): StringValueObject {
    return this.storageKey;
  }
  public getSize(): number {
    return this.size;
  }
  public getMimeType(): StringValueObject {
    return this.mimeType;
  }
}
