import type { OutputSharpening } from '../../application/export-project-photo/messages/ExportProjectPhotoMessage';

export class OutputPixelSharpener {
  private readonly strengths: Record<OutputSharpening, number> = { none: 0, low: 0.18, standard: 0.32, high: 0.5 };

  public sharpen(source: Uint8ClampedArray, width: number, height: number, level: OutputSharpening): Uint8ClampedArray<ArrayBuffer> {
    if (source.length !== width * height * 4) throw new Error('Output dimensions do not match the pixel buffer.');
    const strength = this.strengths[level];
    if (strength === 0 || width < 3 || height < 3) return new Uint8ClampedArray(source);
    const output = new Uint8ClampedArray(source);
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          const center = source[index + channel] ?? 0;
          const neighbours = ((source[index - width * 4 + channel] ?? center) + (source[index + width * 4 + channel] ?? center) + (source[index - 4 + channel] ?? center) + (source[index + 4 + channel] ?? center)) / 4;
          output[index + channel] = Math.round(center + (center - neighbours) * strength);
        }
      }
    }
    return output;
  }
}
