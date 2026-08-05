import { DevelopedPixelBufferGuard } from '@/contexts/projects/infrastructure/renderers/DevelopedPixelBufferGuard';

describe('DevelopedPixelBufferGuard', () => {
  it('accepts a normal developed buffer while rejecting silent transparent and uniform GPU failures', () => {
    const source = new Uint8ClampedArray([
      30, 60, 90, 255, 100, 130, 160, 255,
      180, 150, 120, 255, 220, 200, 180, 255
    ]);
    const guard = new DevelopedPixelBufferGuard();

    expect(guard.isSuspicious(new Uint8ClampedArray(source), source)).toBe(false);
    expect(guard.isSuspicious(new Uint8ClampedArray(source.length), source)).toBe(true);
    expect(guard.isSuspicious(new Uint8ClampedArray([
      0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255
    ]), source)).toBe(true);
  });

  it('does not reject a legitimately uniform source and matching development', () => {
    const black = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]);
    expect(new DevelopedPixelBufferGuard().isSuspicious(black, black)).toBe(false);
  });
});
