/// <reference lib="webworker" />
import { CpuPixelDeveloper } from './CpuPixelDeveloper';
import { CpuViewportTransformer } from './CpuViewportTransformer';
import { ArwEmbeddedPreviewExtractor } from '../codecs/ArwEmbeddedPreviewExtractor';
import { PixelHistogramAnalyzer } from './PixelHistogramAnalyzer';
import { TiffEncoder } from './TiffEncoder';
import { WebGl2PixelDeveloper } from './WebGl2PixelDeveloper';
import { WebGpuPixelDeveloper } from './WebGpuPixelDeveloper';
import {
  previewWorkerRequestSchema,
  type PreviewWorkerResponse
} from './PreviewWorkerProtocol';

const worker = self as DedicatedWorkerGlobalScope;
const developer = new CpuPixelDeveloper();
const viewportTransformer = new CpuViewportTransformer();
const arw = new ArwEmbeddedPreviewExtractor();
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
    const decodableSource = request.sourceMimeType === 'image/x-sony-arw'
      ? arw.extract(await request.source.arrayBuffer()).preview
      : request.source;
    const bitmap = await createImageBitmap(decodableSource);
    progress(request.id, 'decoding', 0.3);
    const scale = request.maximumEdge === null ? 1 : Math.min(1, request.maximumEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { alpha: false });
    if (context === null) throw new Error('The preview context could not be created.');
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const imageData = context.getImageData(0, 0, width, height);
    const webGpuPixels = await webGpuDeveloper.develop(imageData.data, width, height, request.development);
    const webGl2Pixels = webGpuPixels === null ? webGl2Developer.develop(imageData.data, width, height, request.development) : null;
    const pixels = webGpuPixels ?? webGl2Pixels ?? developer.develop(imageData.data, width, height, request.development);
    const backend = webGpuPixels !== null ? 'webgpu' : webGl2Pixels !== null ? 'webgl2' : 'cpu';
    const transformed = viewportTransformer.transform(pixels, width, height, request.development.viewport);
    const outputCanvas = new OffscreenCanvas(transformed.width, transformed.height);
    const outputContext = outputCanvas.getContext('2d', { alpha: false });
    if (outputContext === null) throw new Error('The output preview context could not be created.');
    outputContext.putImageData(new ImageData(transformed.pixels, transformed.width, transformed.height), 0, 0);
    progress(request.id, 'developing', 0.8);
    const analysis = histogram.analyze(transformed.pixels, backend);
    progress(request.id, 'analyzing', 0.88);
    const image = request.output.mimeType === 'image/tiff'
      ? tiff.encode(transformed.pixels, transformed.width, transformed.height)
      : await outputCanvas.convertToBlob({ type: request.output.mimeType, quality: request.output.quality });
    progress(request.id, 'encoding', 0.95);
    post({ kind: 'completed', id: request.id, image, analysis });
  } catch (error: unknown) {
    post({
      kind: 'failed',
      id: request.id,
      message: error instanceof Error ? error.message : 'The preview could not be rendered.'
    });
  }
}

function progress(
  id: string,
  stage: 'queued' | 'decoding' | 'developing' | 'analyzing' | 'encoding',
  completed: number
): void {
  post({ kind: 'progress', id, stage, completed });
}

function post(response: PreviewWorkerResponse): void {
  worker.postMessage(response);
}
