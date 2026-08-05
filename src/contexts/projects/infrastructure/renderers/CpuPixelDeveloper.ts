import type { CurveSetPrimitives } from '../../domain/ToneCurve';
import type { GlobalAdjustmentsPrimitives } from '../../domain/GlobalAdjustments';
import type { AdjustmentKeyPrimitive } from '../../domain/value-objects/AdjustmentKey';
import type { MaskDefinitionPrimitives } from '../../domain/MaskDefinition';
import { CpuMaskEvaluator } from './CpuMaskEvaluator';
import { ToneCurveLut } from './ToneCurveLut';

export type CpuDevelopmentSettings = {
  adjustments: GlobalAdjustmentsPrimitives;
  curves: CurveSetPrimitives;
  disabledAdjustments: AdjustmentKeyPrimitive[];
  masks: MaskDefinitionPrimitives[];
};

type Rgb = { red: number; green: number; blue: number };

export class CpuPixelDeveloper {
  private readonly masks = new CpuMaskEvaluator();

  public develop(
    source: Uint8ClampedArray,
    width: number,
    height: number,
    settings: CpuDevelopmentSettings
  ): Uint8ClampedArray<ArrayBuffer> {
    if (source.length !== width * height * 4) throw new Error('Image dimensions do not match the pixel buffer.');
    const working = new Float32Array(source.length);
    const adjustments = this.activeAdjustments(settings);
    const luts = {
      rgb: ToneCurveLut.create(settings.curves.rgb),
      red: ToneCurveLut.create(settings.curves.red),
      green: ToneCurveLut.create(settings.curves.green),
      blue: ToneCurveLut.create(settings.curves.blue),
      luminance: settings.curves.luminance === null ? null : ToneCurveLut.create(settings.curves.luminance)
    };
    const maskSeeds = new Map(settings.masks.map((mask) => [mask.id, this.maskSeedLuminances(mask, source, width, height)]));
    for (let index = 0; index < source.length; index += 4) {
      const sourcePixel = { red: (source[index] ?? 0) / 255, green: (source[index + 1] ?? 0) / 255, blue: (source[index + 2] ?? 0) / 255 };
      let developed = this.developPixel(sourcePixel, adjustments);
      const x = (index / 4 % width + 0.5) / width;
      const y = (Math.floor(index / 4 / width) + 0.5) / height;
      for (const mask of settings.masks) {
        const seeds = maskSeeds.get(mask.id);
        const weight = this.masks.evaluate(mask, {
          x,
          y,
          luminance: this.luminance(sourcePixel),
          positiveLuminances: seeds?.positive,
          negativeLuminances: seeds?.negative
        });
        if (weight <= 0) continue;
        const local = { ...this.neutralAdjustments(), ...mask.localAdjustments };
        const locallyDeveloped = this.developPixel(developed, local);
        developed = this.mix(developed, locallyDeveloped, weight);
      }
      const curved = this.applyCurves(developed, luts);
      working[index] = curved.red;
      working[index + 1] = curved.green;
      working[index + 2] = curved.blue;
      working[index + 3] = (source[index + 3] ?? 255) / 255;
    }
    const denoised = this.boxBlend(working, width, height, adjustments.noiseReduction / 100);
    const sharpened = this.sharpen(denoised, width, height, adjustments.sharpness / 100);
    return this.toBytes(sharpened);
  }

  private activeAdjustments(settings: CpuDevelopmentSettings): GlobalAdjustmentsPrimitives {
    const active = { ...settings.adjustments };
    for (const key of settings.disabledAdjustments) active[key] = 0;
    return active;
  }

  private neutralAdjustments(): GlobalAdjustmentsPrimitives {
    return {
      exposure: 0,
      temperature: 0,
      tint: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      saturation: 0,
      vibrance: 0,
      clarity: 0,
      dehaze: 0,
      sharpness: 0,
      noiseReduction: 0
    };
  }

  private maskSeedLuminances(
    mask: MaskDefinitionPrimitives,
    source: Uint8ClampedArray,
    width: number,
    height: number
  ): { positive: number[]; negative: number[] } {
    if (mask.shape.kind !== 'ai-segmentation') return { positive: [], negative: [] };
    return {
      positive: mask.shape.positivePoints.map((point) => this.sourceLuminanceAt(source, width, height, point.x, point.y)),
      negative: mask.shape.negativePoints.map((point) => this.sourceLuminanceAt(source, width, height, point.x, point.y))
    };
  }

  private sourceLuminanceAt(source: Uint8ClampedArray, width: number, height: number, x: number, y: number): number {
    const pixelX = Math.min(width - 1, Math.max(0, Math.floor(x * width)));
    const pixelY = Math.min(height - 1, Math.max(0, Math.floor(y * height)));
    const index = (pixelY * width + pixelX) * 4;
    return this.luminance({
      red: (source[index] ?? 0) / 255,
      green: (source[index + 1] ?? 0) / 255,
      blue: (source[index + 2] ?? 0) / 255
    });
  }

  private developPixel(rgb: Rgb, adjustment: GlobalAdjustmentsPrimitives): Rgb {
    const exposure = 2 ** adjustment.exposure;
    let red = rgb.red * exposure;
    let green = rgb.green * exposure;
    let blue = rgb.blue * exposure;
    const temperature = adjustment.temperature / 100;
    const tint = adjustment.tint / 100;
    red += temperature * 0.15 - tint * 0.035;
    green += tint * 0.12 - Math.abs(temperature) * 0.015;
    blue -= temperature * 0.15 + tint * 0.035;
    let luminance = this.luminance({ red, green, blue });
    const shadowWeight = 1 - this.smoothstep(0, 0.55, luminance);
    const highlightWeight = this.smoothstep(0.45, 1, luminance);
    const tonalDelta = shadowWeight * adjustment.shadows / 400 +
      highlightWeight * adjustment.highlights / 400 +
      luminance * adjustment.whites / 500 +
      (1 - luminance) * adjustment.blacks / 500;
    red += tonalDelta;
    green += tonalDelta;
    blue += tonalDelta;
    const contrast = 1 + adjustment.contrast / 100;
    const clarityWeight = 1 - Math.min(1, Math.abs(luminance - 0.5) * 2);
    const clarity = 1 + adjustment.clarity / 180 * clarityWeight;
    const dehaze = 1 + adjustment.dehaze / 140;
    red = ((red - 0.5) * contrast * clarity + 0.5) * dehaze;
    green = ((green - 0.5) * contrast * clarity + 0.5) * dehaze;
    blue = ((blue - 0.5) * contrast * clarity + 0.5) * dehaze;
    luminance = this.luminance({ red, green, blue });
    const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
    const saturation = 1 + adjustment.saturation / 100;
    const vibrance = 1 + adjustment.vibrance / 100 * (1 - Math.min(1, chroma));
    const colorFactor = saturation * vibrance * (1 + Math.max(0, adjustment.dehaze) / 300);
    return {
      red: this.clamp(luminance + (red - luminance) * colorFactor),
      green: this.clamp(luminance + (green - luminance) * colorFactor),
      blue: this.clamp(luminance + (blue - luminance) * colorFactor)
    };
  }

  private applyCurves(rgb: Rgb, luts: {
    rgb: ToneCurveLut;
    red: ToneCurveLut;
    green: ToneCurveLut;
    blue: ToneCurveLut;
    luminance: ToneCurveLut | null;
  }): Rgb {
    let result = {
      red: luts.red.evaluate(luts.rgb.evaluate(rgb.red)),
      green: luts.green.evaluate(luts.rgb.evaluate(rgb.green)),
      blue: luts.blue.evaluate(luts.rgb.evaluate(rgb.blue))
    };
    if (luts.luminance !== null) {
      const before = this.luminance(result);
      const after = luts.luminance.evaluate(before);
      const ratio = before <= 0.000_001 ? 0 : after / before;
      result = { red: result.red * ratio, green: result.green * ratio, blue: result.blue * ratio };
    }
    return { red: this.clamp(result.red), green: this.clamp(result.green), blue: this.clamp(result.blue) };
  }

  private boxBlend(source: Float32Array, width: number, height: number, amount: number): Float32Array {
    if (amount <= 0) return source;
    const output = new Float32Array(source);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        for (let channel = 0; channel < 3; channel += 1) {
          let sum = 0;
          let count = 0;
          for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
            for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
              const sampleX = Math.min(width - 1, Math.max(0, x + offsetX));
              const sampleY = Math.min(height - 1, Math.max(0, y + offsetY));
              sum += source[(sampleY * width + sampleX) * 4 + channel] ?? 0;
              count += 1;
            }
          }
          const index = (y * width + x) * 4 + channel;
          const original = source[index] ?? 0;
          output[index] = original + (sum / count - original) * amount;
        }
      }
    }
    return output;
  }

  private sharpen(source: Float32Array, width: number, height: number, amount: number): Float32Array {
    if (amount <= 0) return source;
    const blurred = this.boxBlend(source, width, height, 1);
    const output = new Float32Array(source);
    for (let index = 0; index < source.length; index += 4) {
      for (let channel = 0; channel < 3; channel += 1) {
        output[index + channel] = this.clamp(
          (source[index + channel] ?? 0) + ((source[index + channel] ?? 0) - (blurred[index + channel] ?? 0)) * amount * 1.5
        );
      }
    }
    return output;
  }

  private toBytes(source: Float32Array): Uint8ClampedArray<ArrayBuffer> {
    const bytes = new Uint8ClampedArray(new ArrayBuffer(source.length));
    for (let index = 0; index < source.length; index += 1) bytes[index] = Math.round(this.clamp(source[index] ?? 0) * 255);
    return bytes;
  }

  private luminance(rgb: Rgb): number { return rgb.red * 0.2126 + rgb.green * 0.7152 + rgb.blue * 0.0722; }
  private mix(start: Rgb, end: Rgb, amount: number): Rgb {
    return {
      red: start.red + (end.red - start.red) * amount,
      green: start.green + (end.green - start.green) * amount,
      blue: start.blue + (end.blue - start.blue) * amount
    };
  }
  private smoothstep(start: number, end: number, value: number): number {
    const x = this.clamp((value - start) / (end - start));
    return x * x * (3 - 2 * x);
  }
  private clamp(value: number): number { return Math.min(1, Math.max(0, value)); }
}
