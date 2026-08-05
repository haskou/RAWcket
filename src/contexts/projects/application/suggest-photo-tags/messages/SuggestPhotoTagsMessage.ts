export class SuggestPhotoTagsMessage {
  public constructor(private readonly image: Blob) {
    if (!image.type.startsWith('image/') || image.size === 0) {
      throw new Error('Automatic tags require a non-empty image preview.');
    }
  }

  public getImage(): Blob { return this.image; }
}
