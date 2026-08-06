import { RawDisplayProfile, type DisplayRgb, type RawDisplayStatistics } from '../../domain/RawDisplayProfile';
import type { RawDisplayToneMapper } from './RawDisplayToneMapper';

export class RawDisplayStatisticsAnalyzer {
  private static readonly MAXIMUM_SAMPLES = 65_536;

  public analyzeBytes(pixels: Uint8ClampedArray): RawDisplayStatistics {
    if (pixels.length === 0 || pixels.length % 4 !== 0) throw new Error('The camera preview must contain RGBA pixels.');
    const pixelCount = pixels.length / 4;
    const step = Math.max(1, Math.floor(pixelCount / RawDisplayStatisticsAnalyzer.MAXIMUM_SAMPLES));
    const samples: DisplayRgb[] = [];
    for (let pixel = 0; pixel < pixelCount; pixel += step) {
      const index = pixel * 4;
      samples.push({
        red: (pixels[index] ?? 0) / 255,
        green: (pixels[index + 1] ?? 0) / 255,
        blue: (pixels[index + 2] ?? 0) / 255
      });
    }
    return this.analyze(samples);
  }

  public analyzeLinear(
    pixels: Uint16Array,
    mapper: RawDisplayToneMapper,
    profile: RawDisplayProfile = RawDisplayProfile.neutral()
  ): RawDisplayStatistics {
    if (pixels.length === 0 || pixels.length % 3 !== 0) throw new Error('The developed RAW must contain linear RGB pixels.');
    const pixelCount = pixels.length / 3;
    const step = Math.max(1, Math.floor(pixelCount / RawDisplayStatisticsAnalyzer.MAXIMUM_SAMPLES));
    const samples: DisplayRgb[] = [];
    for (let pixel = 0; pixel < pixelCount; pixel += step) {
      const index = pixel * 3;
      samples.push(mapper.map({
        red: (pixels[index] ?? 0) / 65_535,
        green: (pixels[index + 1] ?? 0) / 65_535,
        blue: (pixels[index + 2] ?? 0) / 65_535
      }, profile));
    }
    return this.analyze(samples);
  }

  private analyze(samples: DisplayRgb[]): RawDisplayStatistics {
    if (samples.length === 0) throw new Error('Photographic statistics require at least one pixel.');
    const luminances: number[] = [];
    let red = 0;
    let green = 0;
    let blue = 0;
    let saturation = 0;
    for (const sample of samples) {
      red += sample.red;
      green += sample.green;
      blue += sample.blue;
      const maximum = Math.max(sample.red, sample.green, sample.blue);
      const minimum = Math.min(sample.red, sample.green, sample.blue);
      saturation += maximum <= 0 ? 0 : (maximum - minimum) / maximum;
      luminances.push(sample.red * 0.2126 + sample.green * 0.7152 + sample.blue * 0.0722);
    }
    luminances.sort((left, right) => left - right);
    return {
      mean: { red: red / samples.length, green: green / samples.length, blue: blue / samples.length },
      meanSaturation: saturation / samples.length,
      luminanceP05: this.percentile(luminances, 0.05),
      luminanceP50: this.percentile(luminances, 0.5),
      luminanceP95: this.percentile(luminances, 0.95)
    };
  }

  private percentile(sorted: number[], fraction: number): number {
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
  }
}
