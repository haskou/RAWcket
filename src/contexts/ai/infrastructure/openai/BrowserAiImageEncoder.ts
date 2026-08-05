export class BrowserAiImageEncoder {
  public constructor(private readonly maximumDimension = 1280, private readonly jpegQuality = 0.82) {}

  public async encode(source: Blob): Promise<string> {
    const bitmap = await createImageBitmap(source);
    try {
      const scale = Math.min(1, this.maximumDimension / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('This browser cannot prepare a preview for AI Companion.');
      context.drawImage(bitmap, 0, 0, width, height);
      const preview = await canvas.convertToBlob({ type: 'image/jpeg', quality: this.jpegQuality });
      return `data:image/jpeg;base64,${this.toBase64(new Uint8Array(await preview.arrayBuffer()))}`;
    } finally {
      bitmap.close();
    }
  }

  private toBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
  }
}
