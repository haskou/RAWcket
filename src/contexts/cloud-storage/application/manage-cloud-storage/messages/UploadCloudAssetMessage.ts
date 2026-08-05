import { StringValueObject } from '@haskou/value-objects';
import type { CloudAssetKind } from '../../ports/CloudStorageGateway';

export class UploadCloudAssetMessage {
  private readonly name: StringValueObject;
  public constructor(name: string, private readonly content: Blob, private readonly kind: CloudAssetKind) {
    this.name = new StringValueObject(name.trim(), 240);
    if (this.name.isEmpty()) throw new Error('A cloud asset name cannot be empty.');
    if (content.size < 1) throw new Error('An empty asset cannot be uploaded.');
  }
  public getName(): string { return this.name.valueOf(); }
  public getContent(): Blob { return this.content; }
  public getKind(): CloudAssetKind { return this.kind; }
}
