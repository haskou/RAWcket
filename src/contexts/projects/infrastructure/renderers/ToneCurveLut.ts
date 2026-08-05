import type { ToneCurvePrimitives } from '../../domain/ToneCurve';

export class ToneCurveLut {
  private constructor(private readonly values: Float32Array) {}

  public static create(curve: ToneCurvePrimitives, size = 1024): ToneCurveLut {
    if (!Number.isSafeInteger(size) || size < 2 || size > 4096) {
      throw new Error('A curve LUT must contain between 2 and 4096 entries.');
    }
    const values = new Float32Array(size);
    const slopes = curve.interpolation === 'monotonic-cubic'
      ? ToneCurveLut.monotonicSlopes(curve.points)
      : [];
    for (let index = 0; index < size; index += 1) {
      const x = index / (size - 1);
      values[index] = curve.interpolation === 'linear'
        ? ToneCurveLut.linear(curve.points, x)
        : ToneCurveLut.monotonic(curve.points, slopes, x);
    }
    return new ToneCurveLut(values);
  }

  public evaluate(input: number): number {
    const normalized = Math.min(1, Math.max(0, input));
    const position = normalized * (this.values.length - 1);
    const lower = Math.floor(position);
    const upper = Math.min(this.values.length - 1, lower + 1);
    const mix = position - lower;
    const start = this.values[lower] ?? 0;
    const end = this.values[upper] ?? start;
    return start + (end - start) * mix;
  }

  public toFloat32Array(): Float32Array {
    return new Float32Array(this.values);
  }

  private static segment(points: ToneCurvePrimitives['points'], x: number): number {
    const found = points.findIndex((point) => point.x >= x);
    return Math.max(0, Math.min(points.length - 2, found <= 0 ? 0 : found - 1));
  }

  private static linear(points: ToneCurvePrimitives['points'], x: number): number {
    const index = ToneCurveLut.segment(points, x);
    const start = points[index];
    const end = points[index + 1];
    if (start === undefined || end === undefined) return x;
    const t = (x - start.x) / (end.x - start.x);
    return start.y + (end.y - start.y) * t;
  }

  private static monotonicSlopes(points: ToneCurvePrimitives['points']): number[] {
    const delta = points.slice(0, -1).map((point, index) => {
      const next = points[index + 1];
      return next === undefined ? 0 : (next.y - point.y) / (next.x - point.x);
    });
    return points.map((_point, index) => {
      if (index === 0) return delta[0] ?? 0;
      if (index === points.length - 1) return delta.at(-1) ?? 0;
      const before = delta[index - 1] ?? 0;
      const after = delta[index] ?? 0;
      if (before === 0 || after === 0 || Math.sign(before) !== Math.sign(after)) return 0;
      return 2 / (1 / before + 1 / after);
    });
  }

  private static monotonic(points: ToneCurvePrimitives['points'], slopes: number[], x: number): number {
    const index = ToneCurveLut.segment(points, x);
    const start = points[index];
    const end = points[index + 1];
    if (start === undefined || end === undefined) return x;
    const width = end.x - start.x;
    const t = (x - start.x) / width;
    const t2 = t * t;
    const t3 = t2 * t;
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;
    return Math.min(1, Math.max(0,
      h00 * start.y + h10 * width * (slopes[index] ?? 0) +
      h01 * end.y + h11 * width * (slopes[index + 1] ?? 0)
    ));
  }
}
