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
    for (let pixel = 0; pixel < pixelCount; pixel += 1) luminances[pixel] = this.luminanceAt(source, pixel);
    const output = new Float32Array(new ArrayBuffer(pixelCount * masks.length * Float32Array.BYTES_PER_ELEMENT));
    masks.forEach((mask, maskIndex) => {
      const seeds = this.seedLuminances(mask, luminances, width, height);
      for (let pixel = 0; pixel < pixelCount; pixel += 1) {
        output[maskIndex * pixelCount + pixel] = this.evaluator.evaluate(mask, {
          x: (pixel % width + 0.5) / width,
          y: (Math.floor(pixel / width) + 0.5) / height,
          luminance: luminances[pixel] ?? 0,
          positiveLuminances: seeds.positive,
          negativeLuminances: seeds.negative
        });
      }
    });
    return output;
  }

  private seedLuminances(
    mask: MaskDefinitionPrimitives,
    luminances: Float32Array,
    width: number,
    height: number
  ): { positive: number[]; negative: number[] } {
    if (mask.shape.kind !== 'ai-segmentation') return { positive: [], negative: [] };
    const read = (point: { x: number; y: number }): number => {
      const x = Math.min(width - 1, Math.max(0, Math.floor(point.x * width)));
      const y = Math.min(height - 1, Math.max(0, Math.floor(point.y * height)));
      return luminances[y * width + x] ?? 0;
    };
    return {
      positive: mask.shape.positivePoints.map(read),
      negative: mask.shape.negativePoints.map(read)
    };
  }

  private luminanceAt(source: Uint8ClampedArray, pixel: number): number {
    const index = pixel * 4;
    return ((source[index] ?? 0) / 255) * 0.2126
      + ((source[index + 1] ?? 0) / 255) * 0.7152
      + ((source[index + 2] ?? 0) / 255) * 0.0722;
  }
}
