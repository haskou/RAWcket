import { Abortable, Flow, Semaphore } from '@haskou/flow';
import type {
  PreviewRenderer,
  PreviewRenderControl,
  PreviewRenderRequest
} from '../../application/ports/PreviewRenderer';
import type { SourceFileRepository } from '../../domain/repositories/SourceFileRepository';
import {
  previewWorkerResponseSchema,
  type PreviewWorkerRequest
} from './PreviewWorkerProtocol';
import type { CachingRenderSourceDecoder } from './CachingRenderSourceDecoder';

type PreviewSourceDecoder = Pick<CachingRenderSourceDecoder, 'decode'>;

export class WorkerPreviewRenderer implements PreviewRenderer {
  private readonly capacity = new Semaphore(2);

  public constructor(
    private readonly sources: SourceFileRepository,
    private readonly sourceDecoder: PreviewSourceDecoder
  ) {}

  public async render(
    request: PreviewRenderRequest,
    control: PreviewRenderControl = {}
  ): Promise<Blob> {
    const abortable = new Abortable();
    const abort = (): void => abortable.abort();
    if (control.signal?.aborted === true) abort();
    control.signal?.addEventListener('abort', abort, { once: true });
    try {
      return await new Flow()
        .task((signal) => this.renderInWorker(request, signal, control))
        .limit(this.capacity)
        .timeout(120_000)
        .abortable(abortable)
        .run();
    } finally {
      control.signal?.removeEventListener('abort', abort);
    }
  }

  private async renderInWorker(
    request: PreviewRenderRequest,
    signal: AbortSignal,
    control: PreviewRenderControl
  ): Promise<Blob> {
    const source = await this.sources.find(request.getProjectId());
    if (source === null) throw new Error('The project does not have a renderable original.');
    const project = request.getProject().toPrimitives();
    const recipe = request.getRecipe().toPrimitives();
    const decodedSource = await this.sourceDecoder.decode(
      request.getProjectId(),
      source,
      project.source.mimeType,
      request.getSize().valueOf(),
      true,
      (status) => control.onProgress?.({
        stage: status === 'ready' ? 'developing' : 'decoding',
        completed: status === 'ready' ? 0.3 : 0.1
      })
    );
    if (signal.aborted) throw new DOMException('Rendering was cancelled.', 'AbortError');
    control.onProgress?.({ stage: 'developing', completed: 0.3 });
    const workerRequest: PreviewWorkerRequest = {
      id: crypto.randomUUID(),
      source: decodedSource,
      maximumEdge: request.getSize().valueOf(),
      output: { mimeType: 'image/webp', quality: 0.9, sharpening: 'none', xmpMetadata: null, watermark: null },
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
      const cleanup = (): void => {
        signal.removeEventListener('abort', onAbort);
        worker.terminate();
      };
      const onAbort = (): void => {
        cleanup();
        reject(new DOMException('Rendering was cancelled.', 'AbortError'));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      worker.onerror = (event): void => {
        cleanup();
        reject(new Error(event.message || 'The preview worker failed.'));
      };
      worker.onmessage = (event: MessageEvent<unknown>): void => {
        const response = previewWorkerResponseSchema.safeParse(event.data);
        if (!response.success) {
          cleanup();
          reject(new Error(`The preview worker returned an invalid response: ${response.error.issues.map((issue) => issue.message).join('; ')}`));
          return;
        }
        if (response.data.id !== workerRequest.id) return;
        if (response.data.kind === 'progress') {
          control.onProgress?.({ stage: response.data.stage, completed: response.data.completed });
          return;
        }
        cleanup();
        if (response.data.kind === 'failed') reject(new Error(response.data.message));
        else {
          control.onAnalysis?.(response.data.analysis);
          resolve(new Blob([response.data.image], { type: response.data.mimeType }));
        }
      };
      const transfer = workerRequest.source.kind === 'raw-linear-16-bit'
        ? [workerRequest.source.pixels.buffer]
        : [];
      worker.postMessage(workerRequest, transfer);
    });
  }
}
