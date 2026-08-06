import { RawDisplayProfile, type DisplayRgb } from '../../domain/RawDisplayProfile';

export type { DisplayRgb } from '../../domain/RawDisplayProfile';

export class RawDisplayToneMapper {
  private static readonly DEFAULT_CHROMA_FACTOR = 1.25;
  private static readonly MINIMUM_LUMINANCE = 0.000_001;

  public map(linearRgb: DisplayRgb, profile: RawDisplayProfile = RawDisplayProfile.neutral()): DisplayRgb {
    const encoded = {
      red: this.linearToSrgb(linearRgb.red),
      green: this.linearToSrgb(linearRgb.green),
      blue: this.linearToSrgb(linearRgb.blue)
    };
    const luminance = this.luminance(encoded);
    if (luminance <= RawDisplayToneMapper.MINIMUM_LUMINANCE) return encoded;

    // LibRaw supplies scene-linear, camera-matrix-corrected sRGB. A photographic
    // S-curve keeps the shadow floor while restoring the midtone placement that
    // a normal camera/OS RAW rendering applies before editable adjustments.
    const mappedLuminance = this.photographicContrast(luminance);
    const ratio = mappedLuminance / luminance;
    const chroma = this.enrichChroma(encoded, luminance);
    return profile.render({
      red: this.clamp(chroma.red * ratio),
      green: this.clamp(chroma.green * ratio),
      blue: this.clamp(chroma.blue * ratio)
    });
  }

  private photographicContrast(luminance: number): number {
    return luminance * luminance * (3 - 2 * luminance);
  }

  private enrichChroma(rgb: DisplayRgb, luminance: number): DisplayRgb {
    return {
      red: luminance + (rgb.red - luminance) * RawDisplayToneMapper.DEFAULT_CHROMA_FACTOR,
      green: luminance + (rgb.green - luminance) * RawDisplayToneMapper.DEFAULT_CHROMA_FACTOR,
      blue: luminance + (rgb.blue - luminance) * RawDisplayToneMapper.DEFAULT_CHROMA_FACTOR
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
