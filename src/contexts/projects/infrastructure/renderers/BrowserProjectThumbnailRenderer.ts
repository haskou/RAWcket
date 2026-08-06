import type { ProjectThumbnailRenderer } from '../../application/ports/ProjectThumbnailRenderer';
import type { ExifOrientation } from '../../domain/CaptureMetadata';

type ThumbnailBitmap = Pick<ImageBitmap, 'width' | 'height' | 'close'>;
type ThumbnailContext = Pick<OffscreenCanvasRenderingContext2D, 'setTransform' | 'drawImage'>;
type ThumbnailCanvas = {
  getContext(contextId: '2d'): ThumbnailContext | null;
  convertToBlob(options: ImageEncodeOptions): Promise<Blob>;
};

export type BrowserProjectThumbnailRuntime = {
  decode(image: Blob, applyEmbeddedOrientation: boolean): Promise<ThumbnailBitmap>;
  createCanvas(width: number, height: number): ThumbnailCanvas;
};

const maximumEdge = 720;

function browserRuntime(): BrowserProjectThumbnailRuntime {
  return {
    decode: (image, applyEmbeddedOrientation) => createImageBitmap(image, {
      imageOrientation: applyEmbeddedOrientation ? 'from-image' : 'none'
    }),
    createCanvas: (width, height) => new OffscreenCanvas(width, height)
  };
}

export class BrowserProjectThumbnailRenderer implements ProjectThumbnailRenderer {
  public constructor(private readonly runtime: BrowserProjectThumbnailRuntime = browserRuntime()) {}

  public async render(image: Blob, orientation: ExifOrientation | null): Promise<Blob> {
    const bitmap = await this.runtime.decode(image, orientation === null);
    try {
      const scale = Math.min(1, maximumEdge / Math.max(bitmap.width, bitmap.height));
      const sourceWidth = Math.max(1, Math.round(bitmap.width * scale));
      const sourceHeight = Math.max(1, Math.round(bitmap.height * scale));
      const orientationValue = orientation?.valueOf() ?? 1;
      const swapsAxes = orientationValue >= 5;
      const canvas = this.runtime.createCanvas(
        swapsAxes ? sourceHeight : sourceWidth,
        swapsAxes ? sourceWidth : sourceHeight
      );
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('This browser cannot render project thumbnails.');
      context.setTransform(...this.transformFor(orientationValue, sourceWidth, sourceHeight));
      context.drawImage(bitmap, 0, 0, sourceWidth, sourceHeight);
      return await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 });
    } finally {
      bitmap.close();
    }
  }

  private transformFor(orientation: number, width: number, height: number): [number, number, number, number, number, number] {
    switch (orientation) {
      case 2: return [-1, 0, 0, 1, width, 0];
      case 3: return [-1, 0, 0, -1, width, height];
      case 4: return [1, 0, 0, -1, 0, height];
      case 5: return [0, 1, 1, 0, 0, 0];
      case 6: return [0, 1, -1, 0, height, 0];
      case 7: return [0, -1, -1, 0, height, width];
      case 8: return [0, -1, 1, 0, 0, width];
      default: return [1, 0, 0, 1, 0, 0];
    }
  }
}
