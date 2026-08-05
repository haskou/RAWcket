import { CurveSet } from '@/contexts/projects/domain/ToneCurve';
import { GlobalAdjustments } from '@/contexts/projects/domain/GlobalAdjustments';
import { CpuPixelDeveloper, type CpuDevelopmentSettings } from '@/contexts/projects/infrastructure/renderers/CpuPixelDeveloper';

function settings(exposure = 0, contrast = 0): CpuDevelopmentSettings {
  const adjustments = GlobalAdjustments.neutral().toPrimitives();
  return {
    adjustments: { ...adjustments, exposure, contrast },
    curves: CurveSet.identity().toPrimitives(),
    disabledAdjustments: [],
    masks: []
  };
}

describe('CpuPixelDeveloper', () => {
  it('keeps linear 16-bit precision through exposure before display conversion', () => {
    const developed = new CpuPixelDeveloper().developHighDepthLinear(
      new Uint16Array([16_384, 16_384, 16_384]),
      1,
      1,
      settings(1)
    );

    expect(developed[0]).toBeGreaterThanOrEqual(160);
    expect(developed[0]).toBeLessThanOrEqual(162);
    expect(developed[3]).toBe(255);
  });

  it('applies real exposure to RGB and preserves alpha', () => {
    const developed = new CpuPixelDeveloper().develop(
      new Uint8ClampedArray([64, 32, 16, 120]),
      1,
      1,
      settings(1)
    );
    expect([...developed]).toEqual([128, 64, 32, 120]);
  });

  it('applies contrast around middle gray and clamps channels', () => {
    const developed = new CpuPixelDeveloper().develop(
      new Uint8ClampedArray([0, 128, 255, 255]),
      1,
      1,
      settings(0, 100)
    );
    expect(developed[0]).toBe(0);
    expect(developed[1]).toBeGreaterThanOrEqual(128);
    expect(developed[2]).toBe(255);
  });

  it('applies RGB tone curves through a LUT', () => {
    const developed = new CpuPixelDeveloper().develop(
      new Uint8ClampedArray([64, 64, 64, 255]),
      1,
      1,
      {
        adjustments: GlobalAdjustments.neutral().toPrimitives(),
        curves: {
          ...CurveSet.identity().toPrimitives(),
          rgb: { points: [{ x: 0, y: 0 }, { x: 0.25, y: 0.5 }, { x: 1, y: 1 }], interpolation: 'linear' }
        },
        disabledAdjustments: [],
        masks: []
      }
    );
    expect(developed[0]).toBeGreaterThan(100);
  });

  it('applies local adjustments only inside an enabled brush mask', () => {
    const developed = new CpuPixelDeveloper().develop(
      new Uint8ClampedArray([64, 64, 64, 255, 64, 64, 64, 255]),
      2,
      1,
      {
        ...settings(),
        masks: [{
          id: crypto.randomUUID(),
          enabled: true,
          inverted: false,
          opacity: 1,
          feather: 0,
          density: 1,
          localAdjustments: { exposure: 1 },
          shape: { kind: 'brush', strokes: [{ points: [{ x: 0.25, y: 0.5 }], size: 0.4, hardness: 1, flow: 1 }] }
        }]
      }
    );

    expect([...developed]).toEqual([128, 128, 128, 255, 64, 64, 64, 255]);
  });

  it('applies a non-destructive edge vignette while preserving the center', () => {
    const adjustments = { ...GlobalAdjustments.neutral().toPrimitives(), vignette: -100 };
    const source = new Uint8ClampedArray(5 * 5 * 4).fill(255);
    const developed = new CpuPixelDeveloper().develop(source, 5, 5, {
      ...settings(),
      adjustments
    });
    const corner = developed[0] ?? 0;
    const center = developed[(2 * 5 + 2) * 4] ?? 0;

    expect(corner).toBeLessThan(center);
    expect(center).toBe(255);
  });

  it('applies texture as a bounded spatial detail treatment', () => {
    const adjustments = { ...GlobalAdjustments.neutral().toPrimitives(), texture: 100 };
    const source = new Uint8ClampedArray([
      80, 80, 80, 255, 80, 80, 80, 255, 80, 80, 80, 255,
      80, 80, 80, 255, 140, 140, 140, 255, 80, 80, 80, 255,
      80, 80, 80, 255, 80, 80, 80, 255, 80, 80, 80, 255
    ]);
    const developed = new CpuPixelDeveloper().develop(source, 3, 3, { ...settings(), adjustments });

    expect(developed[16]).toBeGreaterThan(140);
  });
});
