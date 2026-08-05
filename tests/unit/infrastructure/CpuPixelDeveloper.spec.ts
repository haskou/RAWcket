import { CpuPixelDeveloper } from '@/contexts/projects/infrastructure/renderers/CpuPixelDeveloper';

describe('CpuPixelDeveloper', () => {
  it('aplica exposicion real a RGB y conserva alpha', () => {
    const developed = new CpuPixelDeveloper().develop(new Uint8ClampedArray([64, 32, 16, 120]), 1, 0);
    expect([...developed]).toEqual([128, 64, 32, 120]);
  });

  it('aplica contraste alrededor del gris medio y limita canales', () => {
    const developed = new CpuPixelDeveloper().develop(
      new Uint8ClampedArray([0, 128, 255, 255]),
      0,
      100
    );
    expect(developed[0]).toBe(0);
    expect(developed[1]).toBeGreaterThanOrEqual(128);
    expect(developed[2]).toBe(255);
  });
});
