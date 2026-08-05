export class ReviewImportCandidatesMessage {
  private readonly files: readonly File[];

  public constructor(files: readonly File[]) {
    if (files.length < 2 || files.length > 20) throw new Error('Select between 2 and 20 photographs for comparison.');
    this.files = [...files];
  }

  public getFiles(): readonly File[] { return this.files; }
}
