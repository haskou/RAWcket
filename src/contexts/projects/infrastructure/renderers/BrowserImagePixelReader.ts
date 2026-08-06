export interface ImagePixelReader {
  read(image: Blob): Promise<Uint8ClampedArray>;
}

export class BrowserImagePixelReader implements ImagePixelReader {
  private static readonly MAXIMUM_EDGE = 512;

  public async read(image: Blob): Promise<Uint8ClampedArray> {
    const bitmap = await createImageBitmap(image);
    try {
      const scale = Math.min(1, BrowserImagePixelReader.MAXIMUM_EDGE / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
      if (context === null) throw new Error('The camera reference could not be measured.');
      context.drawImage(bitmap, 0, 0, width, height);
      return new Uint8ClampedArray(context.getImageData(0, 0, width, height).data);
    } finally {
      bitmap.close();
    }
  }
}
