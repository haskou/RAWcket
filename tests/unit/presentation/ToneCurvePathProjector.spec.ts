import { ToneCurvePathProjector } from '@/presentation/editor/ToneCurvePathProjector';

describe('ToneCurvePathProjector', () => {
  it('projects the neutral curve as a clean diagonal', () => {
    const path = ToneCurvePathProjector.project({
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      interpolation: 'monotonic-cubic'
    }, 2);

    expect(path).toBe('M0,1 L0.5,0.5 L1,0');
  });

  it('projects a smooth monotonic curve through editable anchors', () => {
    const path = ToneCurvePathProjector.project({
      points: [{ x: 0, y: 0 }, { x: 0.25, y: 0.1 }, { x: 0.75, y: 0.9 }, { x: 1, y: 1 }],
      interpolation: 'monotonic-cubic'
    }, 128);

    expect(path.split(' ')).toHaveLength(129);
    expect(path).toMatch(/^M0,1 /);
    expect(path).toMatch(/ L1,0$/);
  });
});
