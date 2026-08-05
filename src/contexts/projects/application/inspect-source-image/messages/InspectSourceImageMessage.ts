export class InspectSourceImageMessage {
  public constructor(
    private readonly file: Blob,
    private readonly fileName: string
  ) {
    if (file.size <= 0) throw new Error('The selected image is empty.');
    if (fileName.trim().length === 0 || fileName.length > 255) throw new Error('The selected image must have a valid file name.');
  }

  public getFile(): Blob { return this.file; }
  public getFileName(): string { return this.fileName; }
}
