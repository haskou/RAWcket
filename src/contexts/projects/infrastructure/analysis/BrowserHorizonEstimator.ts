import type {
  HorizonEstimate,
  HorizonEstimationOptions,
  HorizonEstimator
} from '../../application/ports/HorizonEstimator';

type HorizonPixels = { width: number; height: number; data: Uint8ClampedArray };
export type HorizonEstimatorRuntime = {
  read: (image: Blob, signal: AbortSignal) => Promise<HorizonPixels>;
};

const maximumAnalysisDimension = 512;
const maximumDetectableAngle = 20;
const angleBinSize = 0.25;
const strongEdgeThreshold = 90;

function browserRuntime(): HorizonEstimatorRuntime {
  return {
    read: async (image, signal) => {
      throwIfAborted(signal);
      const bitmap = await createImageBitmap(image);
      try {
        const scale = Math.min(1, maximumAnalysisDimension / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(3, Math.round(bitmap.width * scale));
        const height = Math.max(3, Math.round(bitmap.height * scale));
        const canvas = typeof OffscreenCanvas === 'undefined'
          ? Object.assign(document.createElement('canvas'), { width, height })
          : new OffscreenCanvas(width, height);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context === null || !('getImageData' in context)) throw new Error('This browser cannot read pixels for horizon estimation.');
        context.drawImage(bitmap, 0, 0, width, height);
        throwIfAborted(signal);
        return { width, height, data: context.getImageData(0, 0, width, height).data };
      } finally {
        bitmap.close();
      }
    }
  };
}

export class BrowserHorizonEstimator implements HorizonEstimator {
  public constructor(private readonly runtime: HorizonEstimatorRuntime = browserRuntime()) {}

  public async estimate(image: Blob, options: HorizonEstimationOptions): Promise<HorizonEstimate> {
    throwIfAborted(options.signal);
    const pixels = await this.runtime.read(image, options.signal);
    throwIfAborted(options.signal);
    if (pixels.width < 3 || pixels.height < 3 || pixels.data.length !== pixels.width * pixels.height * 4) {
      throw new Error('The image preview is too small for horizon estimation.');
    }
    const luminance = this.luminance(pixels);
    const binCount = Math.ceil(maximumDetectableAngle * 2 / angleBinSize) + 1;
    const histogram = new Float64Array(binCount);
    let strongEdgeWeight = 0;
    let supportingEdgeWeight = 0;
    for (let y = 1; y < pixels.height - 1; y += 1) {
      if (y % 32 === 0) throwIfAborted(options.signal);
      for (let x = 1; x < pixels.width - 1; x += 1) {
        const gradient = this.sobel(luminance, pixels.width, x, y);
        if (gradient.magnitude < strongEdgeThreshold) continue;
        strongEdgeWeight += gradient.magnitude;
        const tangent = this.normalizeHalfTurn(Math.atan2(gradient.y, gradient.x) * 180 / Math.PI + 90);
        const deviation = Math.abs(tangent) <= maximumDetectableAngle
          ? tangent
          : Math.abs(Math.abs(tangent) - 90) <= maximumDetectableAngle
            ? tangent - Math.sign(tangent) * 90
            : null;
        if (deviation === null) continue;
        const index = Math.round((deviation + maximumDetectableAngle) / angleBinSize);
        histogram[index] = (histogram[index] ?? 0) + gradient.magnitude;
        supportingEdgeWeight += gradient.magnitude;
      }
    }
    if (supportingEdgeWeight === 0 || strongEdgeWeight === 0) return this.emptyEstimate();
    const peak = this.peakIndex(histogram);
    let weightedAngle = 0;
    let peakWeight = 0;
    for (let offset = -3; offset <= 3; offset += 1) {
      const index = peak + offset;
      if (index < 0 || index >= histogram.length) continue;
      const weight = histogram[index] ?? 0;
      weightedAngle += (-maximumDetectableAngle + index * angleBinSize) * weight;
      peakWeight += weight;
    }
    const detectedAngle = peakWeight === 0 ? 0 : weightedAngle / peakWeight;
    const confidence = Math.min(1, peakWeight / supportingEdgeWeight);
    const supportingEdgeRatio = Math.min(1, supportingEdgeWeight / strongEdgeWeight);
    const reliable = confidence >= 0.08 && supportingEdgeRatio >= 0.04 && Math.abs(detectedAngle) <= 15;
    return {
      correctionDegrees: reliable ? this.round(-detectedAngle) : 0,
      confidence: this.roundUnit(confidence),
      supportingEdgeRatio: this.roundUnit(supportingEdgeRatio),
      reliable
    };
  }

  private luminance(pixels: HorizonPixels): Float32Array<ArrayBuffer> {
    const output = new Float32Array(new ArrayBuffer(pixels.width * pixels.height * Float32Array.BYTES_PER_ELEMENT));
    for (let pixel = 0; pixel < output.length; pixel += 1) {
      const index = pixel * 4;
      output[pixel] = (pixels.data[index] ?? 0) * 0.2126
        + (pixels.data[index + 1] ?? 0) * 0.7152
        + (pixels.data[index + 2] ?? 0) * 0.0722;
    }
    return output;
  }

  private sobel(luminance: Float32Array, width: number, x: number, y: number): { x: number; y: number; magnitude: number } {
    const at = (offsetX: number, offsetY: number): number => luminance[(y + offsetY) * width + x + offsetX] ?? 0;
    const gradientX = -at(-1, -1) + at(1, -1) - 2 * at(-1, 0) + 2 * at(1, 0) - at(-1, 1) + at(1, 1);
    const gradientY = -at(-1, -1) - 2 * at(0, -1) - at(1, -1) + at(-1, 1) + 2 * at(0, 1) + at(1, 1);
    return { x: gradientX, y: gradientY, magnitude: Math.hypot(gradientX, gradientY) };
  }

  private normalizeHalfTurn(angle: number): number {
    let normalized = angle;
    while (normalized >= 90) normalized -= 180;
    while (normalized < -90) normalized += 180;
    return normalized;
  }

  private peakIndex(histogram: Float64Array): number {
    let peak = 0;
    let peakWeight = -1;
    for (let index = 0; index < histogram.length; index += 1) {
      const weight = (histogram[index - 1] ?? 0) + (histogram[index] ?? 0) + (histogram[index + 1] ?? 0);
      if (weight <= peakWeight) continue;
      peak = index;
      peakWeight = weight;
    }
    return peak;
  }

  private emptyEstimate(): HorizonEstimate {
    return { correctionDegrees: 0, confidence: 0, supportingEdgeRatio: 0, reliable: false };
  }
  private round(value: number): number { return Math.round(value * 10) / 10; }
  private roundUnit(value: number): number { return Math.round(value * 1000) / 1000; }
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException('Horizon estimation was cancelled.', 'AbortError');
}
