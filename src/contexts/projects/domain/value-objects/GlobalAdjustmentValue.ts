import { NumberValueObject } from '@haskou/value-objects';
import type { AdjustmentKey } from './AdjustmentKey';

export class GlobalAdjustmentValue extends NumberValueObject {
  private constructor(value: number, key: AdjustmentKey) {
    super(value);
    const minimum = key.isExposure() ? -5 : key.isUnsigned() ? 0 : -100;
    const maximum = key.isExposure() ? 5 : 100;
    if (this.isLessThan(minimum) || this.isGreaterThan(maximum)) {
      throw new Error(`The adjustment must be between ${minimum} and ${maximum}.`);
    }
  }

  public static for(key: AdjustmentKey, value: number): GlobalAdjustmentValue {
    return new GlobalAdjustmentValue(value, key);
  }
}
