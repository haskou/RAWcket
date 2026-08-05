export type PixelHistogram = {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
  shadowClipping: number;
  highlightClipping: number;
};

export class PixelHistogramAnalyzer {
  public constructor(private readonly bucketCount = 64) {
    if (!Number.isSafeInteger(bucketCount) || bucketCount < 16 || bucketCount > 256) {
      throw new Error('A histogram must contain between 16 and 256 buckets.');
    }
  }

  public analyze(pixels: Uint8ClampedArray): PixelHistogram {
    if (pixels.length === 0 || pixels.length % 4 !== 0) throw new Error('A histogram requires a non-empty RGBA pixel buffer.');
    const red = Array<number>(this.bucketCount).fill(0);
    const green = Array<number>(this.bucketCount).fill(0);
    const blue = Array<number>(this.bucketCount).fill(0);
    const luminance = Array<number>(this.bucketCount).fill(0);
    let shadows = 0;
    let highlights = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const redValue = pixels[index] ?? 0;
      const greenValue = pixels[index + 1] ?? 0;
      const blueValue = pixels[index + 2] ?? 0;
      const luma = redValue * 0.2126 + greenValue * 0.7152 + blueValue * 0.0722;
      this.increment(red, this.bucket(redValue));
      this.increment(green, this.bucket(greenValue));
      this.increment(blue, this.bucket(blueValue));
      this.increment(luminance, this.bucket(luma));
      if (redValue <= 1 && greenValue <= 1 && blueValue <= 1) shadows += 1;
      if (redValue >= 254 || greenValue >= 254 || blueValue >= 254) highlights += 1;
    }
    const pixelsCount = pixels.length / 4;
    return {
      red: this.normalize(red),
      green: this.normalize(green),
      blue: this.normalize(blue),
      luminance: this.normalize(luminance),
      shadowClipping: shadows / pixelsCount,
      highlightClipping: highlights / pixelsCount
    };
  }

  private bucket(value: number): number {
    return Math.min(this.bucketCount - 1, Math.floor(value / 256 * this.bucketCount));
  }

  private increment(values: number[], index: number): void {
    values[index] = (values[index] ?? 0) + 1;
  }

  private normalize(values: number[]): number[] {
    const peak = Math.max(...values, 1);
    return values.map((value) => value / peak);
  }
}
