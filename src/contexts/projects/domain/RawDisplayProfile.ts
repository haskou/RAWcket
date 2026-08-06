export type DisplayRgb = { red: number; green: number; blue: number };

export type RawDisplayStatistics = {
  mean: DisplayRgb;
  meanSaturation: number;
  luminanceP05: number;
  luminanceP50: number;
  luminanceP95: number;
};

export type RawDisplayProfilePrimitives = {
  redGain: number;
  greenGain: number;
  blueGain: number;
  sourceMedian: number;
  targetMedian: number;
  shadowContrast: number;
  highlightContrast: number;
  chroma: number;
};

export class RawDisplayProfile {
  private static readonly MINIMUM_LUMINANCE = 0.000_001;

  private constructor(private readonly values: RawDisplayProfilePrimitives) {}

  public static neutral(): RawDisplayProfile {
    return new RawDisplayProfile({
      redGain: 1,
      greenGain: 1,
      blueGain: 1,
      sourceMedian: 0,
      targetMedian: 0,
      shadowContrast: 1,
      highlightContrast: 1,
      chroma: 1
    });
  }

  public static estimate(source: RawDisplayStatistics, reference: RawDisplayStatistics): RawDisplayProfile {
    const gains = RawDisplayProfile.chromaticityGains(source.mean, reference.mean);
    const sourceShadowRange = Math.max(
      RawDisplayProfile.MINIMUM_LUMINANCE,
      source.luminanceP50 - source.luminanceP05
    );
    const referenceShadowRange = Math.max(
      RawDisplayProfile.MINIMUM_LUMINANCE,
      reference.luminanceP50 - reference.luminanceP05
    );
    const sourceHighlightRange = Math.max(
      RawDisplayProfile.MINIMUM_LUMINANCE,
      source.luminanceP95 - source.luminanceP50
    );
    const referenceHighlightRange = Math.max(
      RawDisplayProfile.MINIMUM_LUMINANCE,
      reference.luminanceP95 - reference.luminanceP50
    );
    return new RawDisplayProfile({
      ...gains,
      sourceMedian: source.luminanceP50,
      targetMedian: reference.luminanceP50,
      shadowContrast: RawDisplayProfile.clamp(referenceShadowRange / sourceShadowRange, 0.75, 1.35),
      highlightContrast: RawDisplayProfile.clamp(referenceHighlightRange / sourceHighlightRange, 0.75, 1.35),
      chroma: 1
    });
  }

  public matchChroma(sourceSaturation: number, referenceSaturation: number): RawDisplayProfile {
    if (!Number.isFinite(sourceSaturation) || !Number.isFinite(referenceSaturation)) {
      throw new Error('RAW chroma calibration requires finite saturation measurements.');
    }
    const chroma = sourceSaturation <= RawDisplayProfile.MINIMUM_LUMINANCE
      ? 1
      : referenceSaturation / sourceSaturation;
    return RawDisplayProfile.fromPrimitives({
      ...this.values,
      chroma: RawDisplayProfile.clamp(chroma, 0.8, 1.5)
    });
  }

  public static fromPrimitives(values: RawDisplayProfilePrimitives): RawDisplayProfile {
    const numbers = Object.values(values);
    if (numbers.some((value) => !Number.isFinite(value))) {
      throw new Error('The RAW display profile must contain finite values.');
    }
    return new RawDisplayProfile({
      redGain: RawDisplayProfile.clamp(values.redGain, 0.85, 1.15),
      greenGain: RawDisplayProfile.clamp(values.greenGain, 0.85, 1.15),
      blueGain: RawDisplayProfile.clamp(values.blueGain, 0.85, 1.15),
      sourceMedian: RawDisplayProfile.clamp(values.sourceMedian, 0, 1),
      targetMedian: RawDisplayProfile.clamp(values.targetMedian, 0, 1),
      shadowContrast: RawDisplayProfile.clamp(values.shadowContrast, 0.75, 1.35),
      highlightContrast: RawDisplayProfile.clamp(values.highlightContrast, 0.75, 1.35),
      chroma: RawDisplayProfile.clamp(values.chroma, 0.8, 1.5)
    });
  }

  public render(rgb: DisplayRgb): DisplayRgb {
    if (this.isNeutral()) return rgb;
    const balanced = {
      red: rgb.red * this.values.redGain,
      green: rgb.green * this.values.greenGain,
      blue: rgb.blue * this.values.blueGain
    };
    const luminance = RawDisplayProfile.luminance(balanced);
    if (luminance <= RawDisplayProfile.MINIMUM_LUMINANCE) return balanced;
    const contrast = luminance < this.values.sourceMedian
      ? this.values.shadowContrast
      : this.values.highlightContrast;
    const targetLuminance = RawDisplayProfile.clamp(
      this.values.targetMedian + (luminance - this.values.sourceMedian) * contrast,
      0,
      1
    );
    const ratio = targetLuminance / luminance;
    return {
      red: RawDisplayProfile.clamp((luminance + (balanced.red - luminance) * this.values.chroma) * ratio, 0, 1),
      green: RawDisplayProfile.clamp((luminance + (balanced.green - luminance) * this.values.chroma) * ratio, 0, 1),
      blue: RawDisplayProfile.clamp((luminance + (balanced.blue - luminance) * this.values.chroma) * ratio, 0, 1)
    };
  }

  public isNeutral(): boolean {
    return this.values.redGain === 1
      && this.values.greenGain === 1
      && this.values.blueGain === 1
      && this.values.sourceMedian === 0
      && this.values.targetMedian === 0
      && this.values.shadowContrast === 1
      && this.values.highlightContrast === 1
      && this.values.chroma === 1;
  }

  public toPrimitives(): RawDisplayProfilePrimitives {
    return { ...this.values };
  }

  private static chromaticityGains(source: DisplayRgb, reference: DisplayRgb): Pick<RawDisplayProfilePrimitives, 'redGain' | 'greenGain' | 'blueGain'> {
    const sourceTotal = source.red + source.green + source.blue;
    const referenceTotal = reference.red + reference.green + reference.blue;
    if (sourceTotal <= RawDisplayProfile.MINIMUM_LUMINANCE || referenceTotal <= RawDisplayProfile.MINIMUM_LUMINANCE) {
      return { redGain: 1, greenGain: 1, blueGain: 1 };
    }
    const rawGains = {
      red: RawDisplayProfile.clamp(reference.red / referenceTotal / (source.red / sourceTotal), 0.85, 1.15),
      green: RawDisplayProfile.clamp(reference.green / referenceTotal / (source.green / sourceTotal), 0.85, 1.15),
      blue: RawDisplayProfile.clamp(reference.blue / referenceTotal / (source.blue / sourceTotal), 0.85, 1.15)
    };
    const sourceLuminance = RawDisplayProfile.luminance(source);
    const adjustedLuminance = RawDisplayProfile.luminance({
      red: source.red * rawGains.red,
      green: source.green * rawGains.green,
      blue: source.blue * rawGains.blue
    });
    const normalization = adjustedLuminance <= RawDisplayProfile.MINIMUM_LUMINANCE ? 1 : sourceLuminance / adjustedLuminance;
    return {
      redGain: RawDisplayProfile.clamp(rawGains.red * normalization, 0.85, 1.15),
      greenGain: RawDisplayProfile.clamp(rawGains.green * normalization, 0.85, 1.15),
      blueGain: RawDisplayProfile.clamp(rawGains.blue * normalization, 0.85, 1.15)
    };
  }

  private static luminance(rgb: DisplayRgb): number {
    return rgb.red * 0.2126 + rgb.green * 0.7152 + rgb.blue * 0.0722;
  }

  private static clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
  }
}
