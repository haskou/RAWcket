import { GlobalAdjustmentValue } from '@/contexts/projects/domain/value-objects/GlobalAdjustmentValue';
import { AdjustmentKey } from '@/contexts/projects/domain/value-objects/AdjustmentKey';

describe('GlobalAdjustmentValue', () => {
  it('acepta los limites propios de exposicion', () => {
    expect(GlobalAdjustmentValue.for(AdjustmentKey.EXPOSURE, 5).isEqual(
      GlobalAdjustmentValue.for(AdjustmentKey.EXPOSURE, 5)
    )).toBe(true);
  });

  it('rechaza valores fuera de rango y ajustes unsigned negativos', () => {
    expect(() => GlobalAdjustmentValue.for(AdjustmentKey.EXPOSURE, 5.01)).toThrow(/entre -5 y 5/);
    expect(() => GlobalAdjustmentValue.for(AdjustmentKey.SHARPNESS, -1)).toThrow(/entre 0 y 100/);
  });
});
