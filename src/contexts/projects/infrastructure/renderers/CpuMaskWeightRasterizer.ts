import type { MaskDefinitionPrimitives } from '../../domain/MaskDefinition';
import { CpuMaskEvaluator } from './CpuMaskEvaluator';

export class CpuMaskWeightRasterizer {
  private readonly evaluator = new CpuMaskEvaluator();

  public rasterize(
    source: Uint8ClampedArray,
    width: number,
    height: number,
    masks: MaskDefinitionPrimitives[]
  ): Float32Array<ArrayBuffer> {
    if (source.length !== width * height * 4) throw new Error('Image dimensions do not match the mask raster source.');
    const pixelCount = width * height;
    const luminances = new Float32Array(new ArrayBuffer(pixelCount * Float32Array.BYTES_PER_ELEMENT));
    const colors = new Float32Array(new ArrayBuffer(pixelCount * 3 * Float32Array.BYTES_PER_ELEMENT));
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const color = this.colorAt(source, pixel);
      colors.set(color, pixel * 3);
      luminances[pixel] = this.luminance(color);
    }
    const pixelAt = (point: { x: number; y: number }): number => {
      const x = Math.min(width - 1, Math.max(0, Math.floor(point.x * width)));
      const y = Math.min(height - 1, Math.max(0, Math.floor(point.y * height)));
      return y * width + x;
    };
    const sourceColorAt = (point: { x: number; y: number }): readonly [number, number, number] => {
      const offset = pixelAt(point) * 3;
      return [colors[offset] ?? 0, colors[offset + 1] ?? 0, colors[offset + 2] ?? 0];
    };
    const sourceLuminanceAt = (point: { x: number; y: number }): number => luminances[pixelAt(point)] ?? 0;
    const output = new Float32Array(new ArrayBuffer(pixelCount * masks.length * Float32Array.BYTES_PER_ELEMENT));
    masks.forEach((mask, maskIndex) => {
      for (let pixel = 0; pixel < pixelCount; pixel += 1) {
        const colorOffset = pixel * 3;
        output[maskIndex * pixelCount + pixel] = this.evaluator.evaluate(mask, {
          x: (pixel % width + 0.5) / width,
          y: (Math.floor(pixel / width) + 0.5) / height,
          luminance: luminances[pixel] ?? 0,
          color: [colors[colorOffset] ?? 0, colors[colorOffset + 1] ?? 0, colors[colorOffset + 2] ?? 0],
          sourceColorAt,
          sourceLuminanceAt
        });
      }
    });
    return output;
  }

  private colorAt(source: Uint8ClampedArray, pixel: number): readonly [number, number, number] {
    const index = pixel * 4;
    return [(source[index] ?? 0) / 255, (source[index + 1] ?? 0) / 255, (source[index + 2] ?? 0) / 255];
  }

  private luminance(color: readonly [number, number, number]): number {
    return color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
  }
}
