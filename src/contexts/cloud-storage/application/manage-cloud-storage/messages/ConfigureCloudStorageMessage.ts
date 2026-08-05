export class ConfigureCloudStorageMessage {
  public constructor(private readonly autoUploadExports: boolean) {}
  public shouldAutoUploadExports(): boolean { return this.autoUploadExports; }
}
