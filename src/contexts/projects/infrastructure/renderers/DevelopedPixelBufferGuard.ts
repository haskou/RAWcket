export class DevelopedPixelBufferGuard {
  public isSuspicious(candidate: Uint8ClampedArray, source: Uint8ClampedArray): boolean {
    if (candidate.length !== source.length || candidate.length === 0 || candidate.length % 4 !== 0) return true;
    const pixelCount = candidate.length / 4;
    const stride = Math.max(1, Math.floor(pixelCount / 4_096));
    let samples = 0;
    let alphaMismatch = 0;
    let candidateLight = 0;
    let sourceLight = 0;
    let candidateMinimum = 255;
    let candidateMaximum = 0;
    for (let pixel = 0; pixel < pixelCount; pixel += stride) {
      const index = pixel * 4;
      const candidateValue = ((candidate[index] ?? 0) + (candidate[index + 1] ?? 0) + (candidate[index + 2] ?? 0)) / 3;
      const sourceValue = ((source[index] ?? 0) + (source[index + 1] ?? 0) + (source[index + 2] ?? 0)) / 3;
      candidateLight += candidateValue;
      sourceLight += sourceValue;
      candidateMinimum = Math.min(candidateMinimum, candidateValue);
      candidateMaximum = Math.max(candidateMaximum, candidateValue);
      if (Math.abs((candidate[index + 3] ?? 0) - (source[index + 3] ?? 0)) > 2) alphaMismatch += 1;
      samples += 1;
    }
    if (samples === 0 || alphaMismatch / samples > 0.01) return true;
    const sourceAverage = sourceLight / samples;
    const candidateAverage = candidateLight / samples;
    const sourceHasVisibleRange = sourceAverage > 3 && sourceAverage < 252;
    const candidateIsUniformExtreme = candidateMaximum - candidateMinimum < 0.5 && (candidateAverage < 0.5 || candidateAverage > 254.5);
    return sourceHasVisibleRange && candidateIsUniformExtreme;
  }
}
