import { StringValueObject } from '@haskou/value-objects';

export class ConfigureCloudStorageMessage {
  private readonly clientId: StringValueObject;
  public constructor(clientId: string, private readonly autoUploadExports: boolean) {
    this.clientId = new StringValueObject(clientId.trim(), 300);
    if (this.clientId.isEmpty() || !this.clientId.valueOf().endsWith('.apps.googleusercontent.com')) throw new Error('Enter a valid Google OAuth Web Client ID.');
  }
  public getClientId(): string { return this.clientId.valueOf(); }
  public shouldAutoUploadExports(): boolean { return this.autoUploadExports; }
}
