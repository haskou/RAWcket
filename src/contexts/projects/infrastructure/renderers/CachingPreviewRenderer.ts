import type {
  PreviewAnalysis,
  PreviewRenderer,
  PreviewRenderControl,
  PreviewRenderRequest
} from '../../application/ports/PreviewRenderer';

type PreviewCacheEntry = {
  image: Blob;
  analysis: PreviewAnalysis;
};

export class CachingPreviewRenderer implements PreviewRenderer {
  private static readonly CACHE_FORMAT_VERSION = 3;
  private readonly entries = new Map<string, PreviewCacheEntry>();
  private cachedBytes = 0;

  public constructor(
    private readonly renderer: PreviewRenderer,
    private readonly maximumEntries = 8,
    private readonly maximumBytes = 64 * 1024 * 1024
  ) {
    if (!Number.isSafeInteger(maximumEntries) || maximumEntries < 1) throw new Error('The preview cache must retain at least one entry.');
    if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) throw new Error('The preview cache byte limit must be positive.');
  }

  public async render(request: PreviewRenderRequest, control: PreviewRenderControl = {}): Promise<ImageBitmap | Blob> {
    if (control.signal?.aborted === true) throw new DOMException('Rendering was cancelled.', 'AbortError');
    const key = await this.keyFor(request);
    const cached = this.entries.get(key);
    if (cached !== undefined) {
      this.touch(key, cached);
      control.onProgress?.({ stage: 'cached', completed: 1 });
      control.onAnalysis?.(structuredClone(cached.analysis));
      return cached.image;
    }
    const captured: { analysis?: PreviewAnalysis } = {};
    const result = await this.renderer.render(request, {
      ...control,
      onAnalysis: (value) => {
        captured.analysis = structuredClone(value);
        control.onAnalysis?.(value);
      }
    });
    if (result instanceof Blob && captured.analysis !== undefined && result.size <= this.maximumBytes) {
      this.add(key, { image: result, analysis: captured.analysis });
    }
    return result;
  }

  private async keyFor(request: PreviewRenderRequest): Promise<string> {
    const project = request.getProject().toPrimitives();
    const bytes = new TextEncoder().encode(JSON.stringify({
      cacheFormatVersion: CachingPreviewRenderer.CACHE_FORMAT_VERSION,
      source: project.source,
      recipe: project.recipe,
      maximumEdge: request.getSize().valueOf()
    }));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, '0')).join('');
  }

  private add(key: string, entry: PreviewCacheEntry): void {
    const previous = this.entries.get(key);
    if (previous !== undefined) this.cachedBytes -= previous.image.size;
    this.entries.delete(key);
    this.entries.set(key, entry);
    this.cachedBytes += entry.image.size;
    while (this.entries.size > this.maximumEntries || this.cachedBytes > this.maximumBytes) {
      const oldest = this.entries.entries().next().value;
      if (oldest === undefined) break;
      const [oldestKey, oldestEntry] = oldest;
      this.entries.delete(oldestKey);
      this.cachedBytes -= oldestEntry.image.size;
    }
  }

  private touch(key: string, entry: PreviewCacheEntry): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
  }
}
