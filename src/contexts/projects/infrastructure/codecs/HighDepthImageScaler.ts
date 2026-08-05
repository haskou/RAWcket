export type HighDepthRgbImage = {
  width: number;
  height: number;
  channels: 3;
  bitDepth: 16;
  data: Uint16Array<ArrayBuffer>;
};

export class HighDepthImageScaler {
  public resize(image: HighDepthRgbImage, maximumEdge: number | null): HighDepthRgbImage {
    this.assertValid(image);
    if (maximumEdge === null || Math.max(image.width, image.height) <= maximumEdge) return image;
    if (!Number.isSafeInteger(maximumEdge) || maximumEdge < 1 || maximumEdge > 32_768) {
      throw new Error('A high-depth preview edge must be between 1 and 32768 pixels.');
    }
    const scale = maximumEdge / Math.max(image.width, image.height);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const data = new Uint16Array(new ArrayBuffer(width * height * image.channels * Uint16Array.BYTES_PER_ELEMENT));
    for (let y = 0; y < height; y += 1) {
      const sourceY = (y + 0.5) / scale - 0.5;
      const y0 = Math.max(0, Math.floor(sourceY));
      const y1 = Math.min(image.height - 1, y0 + 1);
      const yWeight = Math.min(1, Math.max(0, sourceY - y0));
      for (let x = 0; x < width; x += 1) {
        const sourceX = (x + 0.5) / scale - 0.5;
        const x0 = Math.max(0, Math.floor(sourceX));
        const x1 = Math.min(image.width - 1, x0 + 1);
        const xWeight = Math.min(1, Math.max(0, sourceX - x0));
        for (let channel = 0; channel < image.channels; channel += 1) {
          const top = this.mix(this.sample(image, x0, y0, channel), this.sample(image, x1, y0, channel), xWeight);
          const bottom = this.mix(this.sample(image, x0, y1, channel), this.sample(image, x1, y1, channel), xWeight);
          data[(y * width + x) * image.channels + channel] = Math.round(this.mix(top, bottom, yWeight));
        }
      }
    }
    return { width, height, channels: image.channels, bitDepth: 16, data };
  }

  private assertValid(image: HighDepthRgbImage): void {
    if (!Number.isSafeInteger(image.width) || !Number.isSafeInteger(image.height) || image.width <= 0 || image.height <= 0) {
      throw new Error('High-depth image dimensions must be positive integers.');
    }
    if (image.data.length !== image.width * image.height * image.channels) {
      throw new Error('High-depth image dimensions do not match its pixel buffer.');
    }
  }

  private sample(image: HighDepthRgbImage, x: number, y: number, channel: number): number {
    return image.data[(y * image.width + x) * image.channels + channel] ?? 0;
  }

  private mix(start: number, end: number, amount: number): number {
    return start + (end - start) * amount;
  }
}
