/// <reference lib="webworker" />
import { CpuPixelDeveloper } from './CpuPixelDeveloper';
import { CpuViewportTransformer } from './CpuViewportTransformer';
import { PixelHistogramAnalyzer } from './PixelHistogramAnalyzer';
import { TiffEncoder } from './TiffEncoder';
import { WebGl2PixelDeveloper } from './WebGl2PixelDeveloper';
import { WebGpuPixelDeveloper } from './WebGpuPixelDeveloper';
import {
  previewWorkerRequestSchema,
  type PreviewWorkerRequest,
  type PreviewWorkerResponse
} from './PreviewWorkerProtocol';

const worker = self as DedicatedWorkerGlobalScope;
const developer = new CpuPixelDeveloper();
const viewportTransformer = new CpuViewportTransformer();
const histogram = new PixelHistogramAnalyzer();
const tiff = new TiffEncoder();
const webGl2Developer = new WebGl2PixelDeveloper();
const webGpuDeveloper = new WebGpuPixelDeveloper();

worker.onmessage = (event: MessageEvent<unknown>): void => {
  void render(event.data);
};

async function render(input: unknown): Promise<void> {
  const parsed = previewWorkerRequestSchema.safeParse(input);
  if (!parsed.success) return;
  const request = parsed.data;
  try {
    progress(request.id, 'queued', 0.05);
    let developed: DevelopedSource;
    if (request.source.kind === 'raw-linear-16-bit') {
      developed = {
        width: request.source.width,
        height: request.source.height,
        pixels: developer.developHighDepthLinear(request.source.pixels, request.source.width, request.source.height, request.development),
        backend: 'cpu',
        sourcePrecision: 'raw-linear-16-bit',
        rawFallbackReason: null
      };
    } else {
      developed = await developBitmap(
        request.source.image,
        request.maximumEdge,
        request.development,
        request.source.sourcePrecision,
        request.source.rawFallbackReason
      );
    }
    const { width, height, pixels, backend, sourcePrecision, rawFallbackReason } = developed;
    const transformed = viewportTransformer.transform(pixels, width, height, request.development.viewport);
    const outputCanvas = new OffscreenCanvas(transformed.width, transformed.height);
    const outputContext = outputCanvas.getContext('2d', { alpha: false });
    if (outputContext === null) throw new Error('The output preview context could not be created.');
    outputContext.putImageData(new ImageData(transformed.pixels, transformed.width, transformed.height), 0, 0);
    progress(request.id, 'developing', 0.8);
    const analysis = histogram.analyze(transformed.pixels, backend, sourcePrecision, rawFallbackReason);
    progress(request.id, 'analyzing', 0.88);
    const image = request.output.mimeType === 'image/tiff'
      ? tiff.encode(transformed.pixels, transformed.width, transformed.height)
      : await outputCanvas.convertToBlob({ type: request.output.mimeType, quality: request.output.quality });
    const imageBytes = await image.arrayBuffer();
    progress(request.id, 'encoding', 0.95);
    post({ kind: 'completed', id: request.id, image: imageBytes, mimeType: request.output.mimeType, analysis }, [imageBytes]);
  } catch (error: unknown) {
    post({
      kind: 'failed',
      id: request.id,
      message: error instanceof Error ? error.message : 'The preview could not be rendered.'
    });
  }
}

type DevelopedSource = {
  width: number;
  height: number;
  pixels: Uint8ClampedArray<ArrayBuffer>;
  backend: 'webgpu' | 'webgl2' | 'cpu';
  sourcePrecision: 'standard-8-bit' | 'raw-linear-16-bit' | 'embedded-preview-8-bit';
  rawFallbackReason: string | null;
};

async function developBitmap(
  source: Blob,
  maximumEdge: number | null,
  development: PreviewWorkerRequest['development'],
  sourcePrecision: DevelopedSource['sourcePrecision'],
  rawFallbackReason: string | null
): Promise<DevelopedSource> {
  const bitmap = await createImageBitmap(source);
  const scale = maximumEdge === null ? 1 : Math.min(1, maximumEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { alpha: false });
  if (context === null) throw new Error('The preview context could not be created.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const imageData = context.getImageData(0, 0, width, height);
  const webGpuPixels = await webGpuDeveloper.develop(imageData.data, width, height, development);
  const webGl2Pixels = webGpuPixels === null ? webGl2Developer.develop(imageData.data, width, height, development) : null;
  return {
    width,
    height,
    pixels: webGpuPixels ?? webGl2Pixels ?? developer.develop(imageData.data, width, height, development),
    backend: webGpuPixels !== null ? 'webgpu' : webGl2Pixels !== null ? 'webgl2' : 'cpu',
    sourcePrecision,
    rawFallbackReason
  };
}

function progress(
  id: string,
  stage: 'queued' | 'decoding' | 'developing' | 'analyzing' | 'encoding',
  completed: number
): void {
  post({ kind: 'progress', id, stage, completed });
}

function post(response: PreviewWorkerResponse, transfer: Transferable[] = []): void {
  worker.postMessage(response, transfer);
}
