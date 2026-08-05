import { Enum } from '@haskou/value-objects';

const adjustmentKeys = [
  'exposure',
  'temperature',
  'tint',
  'contrast',
  'highlights',
  'shadows',
  'whites',
  'blacks',
  'saturation',
  'vibrance',
  'clarity',
  'dehaze',
  'sharpness',
  'noiseReduction'
] as const;

export type AdjustmentKeyPrimitive = (typeof adjustmentKeys)[number];

export class AdjustmentKey extends Enum<AdjustmentKeyPrimitive> {
  public static readonly EXPOSURE = new AdjustmentKey('exposure');
  public static readonly TEMPERATURE = new AdjustmentKey('temperature');
  public static readonly TINT = new AdjustmentKey('tint');
  public static readonly CONTRAST = new AdjustmentKey('contrast');
  public static readonly HIGHLIGHTS = new AdjustmentKey('highlights');
  public static readonly SHADOWS = new AdjustmentKey('shadows');
  public static readonly WHITES = new AdjustmentKey('whites');
  public static readonly BLACKS = new AdjustmentKey('blacks');
  public static readonly SATURATION = new AdjustmentKey('saturation');
  public static readonly VIBRANCE = new AdjustmentKey('vibrance');
  public static readonly CLARITY = new AdjustmentKey('clarity');
  public static readonly DEHAZE = new AdjustmentKey('dehaze');
  public static readonly SHARPNESS = new AdjustmentKey('sharpness');
  public static readonly NOISE_REDUCTION = new AdjustmentKey('noiseReduction');

  private constructor(value: AdjustmentKeyPrimitive) {
    super(value);
  }

  public static fromPrimitives(value: AdjustmentKeyPrimitive): AdjustmentKey {
    return new AdjustmentKey(value);
  }

  public static fromString(value: string): AdjustmentKey {
    const supported = adjustmentKeys.find((candidate) => candidate === value);
    if (supported === undefined) throw new Error(`The ${value} adjustment is not supported.`);
    return new AdjustmentKey(supported);
  }

  public static all(): AdjustmentKey[] {
    return adjustmentKeys.map((value) => new AdjustmentKey(value));
  }

  public getValues(): AdjustmentKeyPrimitive[] {
    return [...adjustmentKeys];
  }

  public isExposure(): boolean {
    return this.isEqual(AdjustmentKey.EXPOSURE);
  }

  public isUnsigned(): boolean {
    return this.isEqual(AdjustmentKey.SHARPNESS) || this.isEqual(AdjustmentKey.NOISE_REDUCTION);
  }
}
