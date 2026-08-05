export class EstimateHorizonMessage {
  public constructor(private readonly image: Blob) {
    if (image.size === 0 || (image.type.length > 0 && !image.type.startsWith('image/'))) {
      throw new Error('Horizon estimation requires a non-empty image preview.');
    }
  }

  public getImage(): Blob { return this.image; }
}
