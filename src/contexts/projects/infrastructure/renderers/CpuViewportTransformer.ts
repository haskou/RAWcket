import type { ViewportTransformPrimitives } from '../../domain/ViewportTransform';

export type TransformedPixelBuffer = {
  pixels: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
};

export class CpuViewportTransformer {
  public transform(
    source: Uint8ClampedArray,
    width: number,
    height: number,
    viewport: ViewportTransformPrimitives
  ): TransformedPixelBuffer {
    if (source.length !== width * height * 4) throw new Error('Image dimensions do not match the pixel buffer.');
    const outputWidth = Math.max(1, Math.round(width * viewport.cropFrame.width));
    const outputHeight = Math.max(1, Math.round(height * viewport.cropFrame.height));
    const output = new Uint8ClampedArray(new ArrayBuffer(outputWidth * outputHeight * 4));
    const radians = viewport.rotationDegrees * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const cropCenterX = viewport.cropFrame.x + viewport.cropFrame.width / 2;
    const cropCenterY = viewport.cropFrame.y + viewport.cropFrame.height / 2;
    const centerX = (cropCenterX + 0.5 - viewport.translation.x) * width;
    const centerY = (cropCenterY + 0.5 - viewport.translation.y) * height;

    for (let y = 0; y < outputHeight; y += 1) {
      for (let x = 0; x < outputWidth; x += 1) {
        let relativeX = (x + 0.5 - outputWidth / 2) / viewport.scale;
        let relativeY = (y + 0.5 - outputHeight / 2) / viewport.scale;
        if (viewport.flipHorizontal) relativeX *= -1;
        if (viewport.flipVertical) relativeY *= -1;
        const sourceX = centerX + relativeX * cosine + relativeY * sine - 0.5;
        const sourceY = centerY - relativeX * sine + relativeY * cosine - 0.5;
        this.sampleBilinear(source, width, height, sourceX, sourceY, output, (y * outputWidth + x) * 4);
      }
    }

    return { pixels: output, width: outputWidth, height: outputHeight };
  }

  private sampleBilinear(
    source: Uint8ClampedArray,
    width: number,
    height: number,
    x: number,
    y: number,
    output: Uint8ClampedArray,
    outputIndex: number
  ): void {
    if (x < 0 || y < 0 || x > width - 1 || y > height - 1) {
      output[outputIndex + 3] = 255;
      return;
    }
    const left = Math.floor(x);
    const top = Math.floor(y);
    const right = Math.min(width - 1, left + 1);
    const bottom = Math.min(height - 1, top + 1);
    const horizontal = x - left;
    const vertical = y - top;
    for (let channel = 0; channel < 4; channel += 1) {
      const topLeft = source[(top * width + left) * 4 + channel] ?? 0;
      const topRight = source[(top * width + right) * 4 + channel] ?? 0;
      const bottomLeft = source[(bottom * width + left) * 4 + channel] ?? 0;
      const bottomRight = source[(bottom * width + right) * 4 + channel] ?? 0;
      const topValue = topLeft + (topRight - topLeft) * horizontal;
      const bottomValue = bottomLeft + (bottomRight - bottomLeft) * horizontal;
      output[outputIndex + channel] = Math.round(topValue + (bottomValue - topValue) * vertical);
    }
  }
}
