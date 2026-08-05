export type DisplayRgb = { red: number; green: number; blue: number };

export class RawDisplayToneMapper {
  private static readonly DEFAULT_CONTRAST_POWER = 1.5;
  private static readonly MINIMUM_LUMINANCE = 0.000_001;

  public map(linearRgb: DisplayRgb): DisplayRgb {
    const encoded = {
      red: this.linearToSrgb(linearRgb.red),
      green: this.linearToSrgb(linearRgb.green),
      blue: this.linearToSrgb(linearRgb.blue)
    };
    const luminance = this.luminance(encoded);
    if (luminance <= RawDisplayToneMapper.MINIMUM_LUMINANCE) return encoded;

    // LibRaw supplies scene-linear pixels. This deterministic base curve gives
    // them display contrast before any reversible recipe adjustment is applied.
    const mappedLuminance = luminance ** RawDisplayToneMapper.DEFAULT_CONTRAST_POWER;
    const ratio = mappedLuminance / luminance;
    return {
      red: this.clamp(encoded.red * ratio),
      green: this.clamp(encoded.green * ratio),
      blue: this.clamp(encoded.blue * ratio)
    };
  }

  private linearToSrgb(value: number): number {
    const linear = Math.max(0, value);
    return linear <= 0.003_130_8 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
  }

  private luminance(rgb: DisplayRgb): number {
    return rgb.red * 0.2126 + rgb.green * 0.7152 + rgb.blue * 0.0722;
  }

  private clamp(value: number): number {
    return Math.min(1, Math.max(0, value));
  }
}
