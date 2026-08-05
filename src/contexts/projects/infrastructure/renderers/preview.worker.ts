/// <reference lib="webworker" />
import { CpuPixelDeveloper } from './CpuPixelDeveloper';
import { CpuViewportTransformer } from './CpuViewportTransformer';
import {
  previewWorkerRequestSchema,
  type PreviewWorkerResponse
} from './PreviewWorkerProtocol';

const worker = self as DedicatedWorkerGlobalScope;
const developer = new CpuPixelDeveloper();
const viewportTransformer = new CpuViewportTransformer();

worker.onmessage = (event: MessageEvent<unknown>): void => {
  void render(event.data);
};

async function render(input: unknown): Promise<void> {
  const parsed = previewWorkerRequestSchema.safeParse(input);
  if (!parsed.success) return;
  const request = parsed.data;
  try {
    progress(request.id, 'queued', 0.05);
    const bitmap = await createImageBitmap(request.source);
    progress(request.id, 'decoding', 0.3);
    const scale = Math.min(1, request.maximumEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { alpha: false });
    if (context === null) throw new Error('The preview context could not be created.');
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const image = context.getImageData(0, 0, width, height);
    const pixels = developer.develop(
      image.data,
      width,
      height,
      request.development
    );
    const transformed = viewportTransformer.transform(pixels, width, height, request.development.viewport);
    const outputCanvas = new OffscreenCanvas(transformed.width, transformed.height);
    const outputContext = outputCanvas.getContext('2d', { alpha: false });
    if (outputContext === null) throw new Error('The output preview context could not be created.');
    outputContext.putImageData(new ImageData(transformed.pixels, transformed.width, transformed.height), 0, 0);
    progress(request.id, 'developing', 0.8);
    const preview = await outputCanvas.convertToBlob({ type: 'image/webp', quality: 0.9 });
    progress(request.id, 'encoding', 0.95);
    post({ kind: 'completed', id: request.id, preview });
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
  stage: 'queued' | 'decoding' | 'developing' | 'encoding',
  completed: number
): void {
  post({ kind: 'progress', id, stage, completed });
}

function post(response: PreviewWorkerResponse): void {
  worker.postMessage(response);
}
