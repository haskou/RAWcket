import { OutputPixelSharpener } from '@/contexts/projects/infrastructure/renderers/OutputPixelSharpener';

describe('OutputPixelSharpener', () => {
  it('keeps none pixel-identical and strengthens an edge after output sizing', () => {
    const source = new Uint8ClampedArray([
      20, 20, 20, 255, 20, 20, 20, 255, 20, 20, 20, 255,
      20, 20, 20, 255, 120, 120, 120, 255, 20, 20, 20, 255,
      20, 20, 20, 255, 20, 20, 20, 255, 20, 20, 20, 255
    ]);
    const sharpener = new OutputPixelSharpener();

    expect(sharpener.sharpen(source, 3, 3, 'none')).toEqual(source);
    const high = sharpener.sharpen(source, 3, 3, 'high');
    expect(high[16]).toBeGreaterThan(source[16] ?? 0);
    expect(high[19]).toBe(255);
  });
});
