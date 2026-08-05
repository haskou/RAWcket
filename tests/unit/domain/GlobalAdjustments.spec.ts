import { GlobalAdjustmentValue } from '@/contexts/projects/domain/value-objects/GlobalAdjustmentValue';
import { AdjustmentKey } from '@/contexts/projects/domain/value-objects/AdjustmentKey';

describe('GlobalAdjustmentValue', () => {
  it('accepts exposure-specific limits', () => {
    expect(GlobalAdjustmentValue.for(AdjustmentKey.EXPOSURE, 5).isEqual(
      GlobalAdjustmentValue.for(AdjustmentKey.EXPOSURE, 5)
    )).toBe(true);
  });

  it('rejects out-of-range values and negative unsigned adjustments', () => {
    expect(() => GlobalAdjustmentValue.for(AdjustmentKey.EXPOSURE, 5.01)).toThrow(/between -5 and 5/);
    expect(() => GlobalAdjustmentValue.for(AdjustmentKey.SHARPNESS, -1)).toThrow(/between 0 and 100/);
  });
});
