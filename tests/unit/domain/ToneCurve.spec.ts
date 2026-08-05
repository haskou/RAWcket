import { ToneCurve } from '@/contexts/projects/domain/ToneCurve';

describe('ToneCurve', () => {
  it('accepts a normalized monotonic cubic curve', () => {
    expect(() => ToneCurve.fromPrimitives({
      points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.62 }, { x: 1, y: 1 }],
      interpolation: 'monotonic-cubic'
    })).not.toThrow();
  });

  it('rejects duplicate, unordered, or incomplete endpoints', () => {
    expect(() => ToneCurve.fromPrimitives({
      points: [{ x: 0, y: 0 }, { x: 0, y: 0.4 }, { x: 1, y: 1 }],
      interpolation: 'linear'
    })).toThrow(/increasing, unique/);
    expect(() => ToneCurve.fromPrimitives({
      points: [{ x: 0.1, y: 0 }, { x: 1, y: 1 }],
      interpolation: 'linear'
    })).toThrow(/start at x=0/);
  });
});
