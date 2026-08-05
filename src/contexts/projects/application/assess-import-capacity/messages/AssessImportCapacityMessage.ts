export class AssessImportCapacityMessage {
  public constructor(private readonly fileSizeBytes: number) {
    if (!Number.isSafeInteger(fileSizeBytes) || fileSizeBytes < 1) {
      throw new Error('The imported file size must be a positive safe integer.');
    }
  }

  public getFileSizeBytes(): number { return this.fileSizeBytes; }
}
