import { AdjustmentKey, type AdjustmentKeyPrimitive } from './value-objects/AdjustmentKey';
import { GlobalAdjustmentValue } from './value-objects/GlobalAdjustmentValue';

export type GlobalAdjustmentsPrimitives = Record<AdjustmentKeyPrimitive, number>;

type AdjustmentEntry = { key: AdjustmentKey; value: GlobalAdjustmentValue };

export class GlobalAdjustments {
  private constructor(private readonly values: readonly AdjustmentEntry[]) {}

  public static neutral(): GlobalAdjustments {
    return GlobalAdjustments.fromPrimitives({
      exposure: 0,
      temperature: 0,
      tint: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      whites: 0,
      blacks: 0,
      saturation: 0,
      vibrance: 0,
      clarity: 0,
      texture: 0,
      dehaze: 0,
      sharpness: 0,
      noiseReduction: 0,
      vignette: 0
    });
  }

  public static fromPrimitives(input: GlobalAdjustmentsPrimitives): GlobalAdjustments {
    const entries = AdjustmentKey.all().map((key): AdjustmentEntry => {
      const primitive = key.valueOf();
      return { key, value: GlobalAdjustmentValue.for(key, input[primitive]) };
    });
    return new GlobalAdjustments(entries);
  }

  public change(key: AdjustmentKey, value: GlobalAdjustmentValue): GlobalAdjustments {
    return new GlobalAdjustments(this.values.map((entry) => entry.key.isEqual(key) ? { key, value } : entry));
  }

  public get(key: AdjustmentKey): GlobalAdjustmentValue {
    const entry = this.values.find((candidate) => candidate.key.isEqual(key));
    if (entry === undefined) {
      throw new Error('The requested adjustment does not exist in the recipe.');
    }
    return entry.value;
  }

  public toPrimitives(): GlobalAdjustmentsPrimitives {
    return {
      exposure: this.get(AdjustmentKey.EXPOSURE).valueOf(),
      temperature: this.get(AdjustmentKey.TEMPERATURE).valueOf(),
      tint: this.get(AdjustmentKey.TINT).valueOf(),
      contrast: this.get(AdjustmentKey.CONTRAST).valueOf(),
      highlights: this.get(AdjustmentKey.HIGHLIGHTS).valueOf(),
      shadows: this.get(AdjustmentKey.SHADOWS).valueOf(),
      whites: this.get(AdjustmentKey.WHITES).valueOf(),
      blacks: this.get(AdjustmentKey.BLACKS).valueOf(),
      saturation: this.get(AdjustmentKey.SATURATION).valueOf(),
      vibrance: this.get(AdjustmentKey.VIBRANCE).valueOf(),
      clarity: this.get(AdjustmentKey.CLARITY).valueOf(),
      texture: this.get(AdjustmentKey.TEXTURE).valueOf(),
      dehaze: this.get(AdjustmentKey.DEHAZE).valueOf(),
      sharpness: this.get(AdjustmentKey.SHARPNESS).valueOf(),
      noiseReduction: this.get(AdjustmentKey.NOISE_REDUCTION).valueOf(),
      vignette: this.get(AdjustmentKey.VIGNETTE).valueOf()
    };
  }
}
