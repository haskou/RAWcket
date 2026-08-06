import { Abortable, Flow, Semaphore } from '@haskou/flow';
import type { ExportProjectPhotoMessage } from '../../application/export-project-photo/messages/ExportProjectPhotoMessage';
import type { PhotoExporter } from '../../application/ports/PhotoExporter';
import type { PreviewRenderControl } from '../../application/ports/PreviewRenderer';
import type { PhotoProject } from '../../domain/PhotoProject';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import { previewWorkerResponseSchema, type PreviewWorkerRequest } from './PreviewWorkerProtocol';
import type { RenderSourceDecoder } from './RenderSourceDecoder';
import { XmpCaptureMetadataSerializer } from './XmpCaptureMetadataSerializer';

export class WorkerPhotoExporter implements PhotoExporter {
  private readonly capacity = new Semaphore(1);
  private readonly metadataSerializer = new XmpCaptureMetadataSerializer();

  public constructor(
    private readonly sources: SourceFileRepository,
    private readonly sourceDecoder: RenderSourceDecoder
  ) {}

  public async export(
    project: PhotoProject,
    message: ExportProjectPhotoMessage,
    control: PreviewRenderControl = {}
  ): Promise<Blob> {
    const abortable = new Abortable();
    const abort = (): void => abortable.abort();
    if (control.signal?.aborted === true) abort();
    control.signal?.addEventListener('abort', abort, { once: true });
    try {
      return await new Flow()
        .task((signal) => this.exportInWorker(project, message, signal, control))
        .limit(this.capacity)
        .timeout(180_000)
        .abortable(abortable)
        .run();
    } finally {
      control.signal?.removeEventListener('abort', abort);
    }
  }

  private async exportInWorker(
    project: PhotoProject,
    message: ExportProjectPhotoMessage,
    signal: AbortSignal,
    control: PreviewRenderControl
  ): Promise<Blob> {
    const source = await this.sources.find(project.getId());
    if (source === null) throw new Error('The project does not have an original to export.');
    const recipe = project.toPrimitives().recipe;
    const xmpMetadata = message.getMetadataPolicy() === 'capture'
      ? this.metadataSerializer.serialize(project.getCaptureMetadata().toPrimitives())
      : null;
    control.onProgress?.({ stage: 'decoding', completed: 0.1 });
    const decodedSource = await this.sourceDecoder.decode(
      source,
      project.getSource().getSupportedMimeType(),
      message.getMaximumEdge(),
      false,
      project.getSource().getDisplayProfile().toPrimitives()
    );
    control.onProgress?.({ stage: 'decoding', completed: 0.3 });
    const workerRequest: PreviewWorkerRequest = {
      id: crypto.randomUUID(),
      source: decodedSource,
      maximumEdge: message.getMaximumEdge(),
      output: {
        mimeType: message.getMimeType(), quality: message.getQuality(),
        sharpening: message.getOutputSharpening(), xmpMetadata, watermark: message.getWatermark()
      },
      development: {
        adjustments: recipe.globalAdjustments,
        curves: recipe.curves,
        disabledAdjustments: recipe.disabledGlobalAdjustments,
        masks: recipe.masks,
        viewport: recipe.viewport
      }
    };
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./preview.worker.ts', import.meta.url), { type: 'module' });
      const cleanup = (): void => { signal.removeEventListener('abort', onAbort); worker.terminate(); };
      const onAbort = (): void => { cleanup(); reject(new DOMException('Photo export was cancelled.', 'AbortError')); };
      signal.addEventListener('abort', onAbort, { once: true });
      worker.onerror = (event): void => { cleanup(); reject(new Error(event.message || 'The photo export worker failed.')); };
      worker.onmessage = (event: MessageEvent<unknown>): void => {
        const response = previewWorkerResponseSchema.safeParse(event.data);
        if (!response.success || response.data.id !== workerRequest.id) return;
        if (response.data.kind === 'progress') {
          control.onProgress?.({ stage: response.data.stage, completed: response.data.completed });
          return;
        }
        if (response.data.kind === 'failed') {
          cleanup();
          reject(new Error(response.data.message));
          return;
        }
        try {
          const image = new Blob([response.data.image], { type: response.data.mimeType });
          cleanup();
          resolve(image);
        } catch (error: unknown) {
          cleanup();
          reject(error instanceof Error ? error : new Error('The completed photo export could not be read.'));
        }
      };
      const transfer = workerRequest.source.kind === 'raw-linear-16-bit'
        ? [workerRequest.source.pixels.buffer]
        : [];
      worker.postMessage(workerRequest, transfer);
    });
  }
}
