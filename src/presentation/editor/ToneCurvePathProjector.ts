import type { ToneCurvePrimitives } from '@/contexts/projects/domain/ToneCurve';

export class ToneCurvePathProjector {
  public static project(curve: ToneCurvePrimitives, samples = 128): string {
    if (!Number.isSafeInteger(samples) || samples < 2 || samples > 1024) {
      throw new Error('A tone-curve plot must contain between 2 and 1024 samples.');
    }
    const slopes = curve.interpolation === 'monotonic-cubic'
      ? ToneCurvePathProjector.monotonicSlopes(curve.points)
      : [];
    return Array.from({ length: samples + 1 }, (_, index) => {
      const x = index / samples;
      const y = curve.interpolation === 'linear'
        ? ToneCurvePathProjector.linear(curve.points, x)
        : ToneCurvePathProjector.monotonic(curve.points, slopes, x);
      return `${index === 0 ? 'M' : 'L'}${ToneCurvePathProjector.coordinate(x)},${ToneCurvePathProjector.coordinate(1 - y)}`;
    }).join(' ');
  }

  private static segment(points: ToneCurvePrimitives['points'], x: number): number {
    const found = points.findIndex((point) => point.x >= x);
    return Math.max(0, Math.min(points.length - 2, found <= 0 ? 0 : found - 1));
  }

  private static linear(points: ToneCurvePrimitives['points'], x: number): number {
    const index = ToneCurvePathProjector.segment(points, x);
    const start = points[index];
    const end = points[index + 1];
    if (start === undefined || end === undefined) return x;
    const progress = (x - start.x) / (end.x - start.x);
    return start.y + (end.y - start.y) * progress;
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
    const index = ToneCurvePathProjector.segment(points, x);
    const start = points[index];
    const end = points[index + 1];
    if (start === undefined || end === undefined) return x;
    const width = end.x - start.x;
    const progress = (x - start.x) / width;
    const squared = progress * progress;
    const cubed = squared * progress;
    const value = (2 * cubed - 3 * squared + 1) * start.y
      + (cubed - 2 * squared + progress) * width * (slopes[index] ?? 0)
      + (-2 * cubed + 3 * squared) * end.y
      + (cubed - squared) * width * (slopes[index + 1] ?? 0);
    return Math.min(1, Math.max(0, value));
  }

  private static coordinate(value: number): string {
    return Number(value.toFixed(5)).toString();
  }
}
