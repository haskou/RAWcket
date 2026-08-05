import { ToneCurve } from '@/contexts/projects/domain/ToneCurve';

describe('ToneCurve', () => {
  it('acepta una curva monotonic-cubic normalizada', () => {
    expect(() => ToneCurve.fromPrimitives({
      points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.62 }, { x: 1, y: 1 }],
      interpolation: 'monotonic-cubic'
    })).not.toThrow();
  });

  it('rechaza puntos duplicados, desordenados o sin extremos', () => {
    expect(() => ToneCurve.fromPrimitives({
      points: [{ x: 0, y: 0 }, { x: 0, y: 0.4 }, { x: 1, y: 1 }],
      interpolation: 'linear'
    })).toThrow(/crecientes y unicas/);
    expect(() => ToneCurve.fromPrimitives({
      points: [{ x: 0.1, y: 0 }, { x: 1, y: 1 }],
      interpolation: 'linear'
    })).toThrow(/empezar en x=0/);
  });
});
