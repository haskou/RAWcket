export class CpuPixelDeveloper {
  public develop(
    source: Uint8ClampedArray,
    exposure: number,
    contrast: number
  ): Uint8ClampedArray<ArrayBuffer> {
    const developed = new Uint8ClampedArray(new ArrayBuffer(source.length));
    const exposureMultiplier = 2 ** exposure;
    const contrastMultiplier = 1 + contrast / 100;
    for (let index = 0; index < source.length; index += 4) {
      developed[index] = this.developChannel(source[index] ?? 0, exposureMultiplier, contrastMultiplier);
      developed[index + 1] = this.developChannel(source[index + 1] ?? 0, exposureMultiplier, contrastMultiplier);
      developed[index + 2] = this.developChannel(source[index + 2] ?? 0, exposureMultiplier, contrastMultiplier);
      developed[index + 3] = source[index + 3] ?? 255;
    }
    return developed;
  }

  private developChannel(channel: number, exposureMultiplier: number, contrastMultiplier: number): number {
    const normalized = channel / 255;
    const contrasted = (normalized - 0.5) * contrastMultiplier + 0.5;
    return Math.round(Math.min(1, Math.max(0, contrasted * exposureMultiplier)) * 255);
  }
}
