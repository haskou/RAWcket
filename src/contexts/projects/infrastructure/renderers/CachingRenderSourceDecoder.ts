import type { ProjectId } from '../../domain/value-objects/ProjectId';
import type { SourceImageMimeType } from '../../domain/SourceImageReference';
import type { DecodedRenderSource, RenderSourceDecoder } from './RenderSourceDecoder';
import type { RawDisplayProfilePrimitives } from '../../domain/RawDisplayProfile';

type Decoder = Pick<RenderSourceDecoder, 'decode'>;
type DecodeStatus = 'decoding' | 'ready';
type PendingEntry = { status: 'decoding'; source: Promise<DecodedRenderSource> };
type ReadyEntry = { status: 'ready'; source: DecodedRenderSource };
type CacheEntry = PendingEntry | ReadyEntry;

export class CachingRenderSourceDecoder {
  private readonly entries = new Map<string, CacheEntry>();

  public constructor(
    private readonly decoder: Decoder,
    private readonly maximumEntries = 2
  ) {
    if (!Number.isSafeInteger(maximumEntries) || maximumEntries < 1) {
      throw new Error('The decoded preview cache must retain at least one source.');
    }
  }

  public async decode(
    projectId: ProjectId,
    source: Blob,
    mimeType: SourceImageMimeType,
    maximumEdge: number | null,
    allowEmbeddedRawFallback: boolean,
    displayProfile: RawDisplayProfilePrimitives,
    onStatus: (status: DecodeStatus) => void
  ): Promise<DecodedRenderSource> {
    const key = this.keyFor(projectId, mimeType, maximumEdge, allowEmbeddedRawFallback, displayProfile);
    const cached = this.entries.get(key);
    if (cached?.status === 'ready') {
      if (cached.source.kind === 'raw-linear-16-bit' && cached.source.pixels.buffer.byteLength === 0) {
        this.entries.delete(key);
      } else {
        this.touch(key, cached);
        onStatus('ready');
        return this.clone(cached.source);
      }
    }
    if (cached?.status === 'decoding') {
      onStatus('decoding');
      return this.clone(await cached.source);
    }

    onStatus('decoding');
    const decoding = this.decoder.decode(source, mimeType, maximumEdge, allowEmbeddedRawFallback, displayProfile);
    const pending: PendingEntry = { status: 'decoding', source: decoding };
    this.entries.set(key, pending);
    try {
      const decoded = await decoding;
      if (this.entries.get(key) === pending) {
        const retained = this.clone(decoded);
        this.entries.delete(key);
        this.entries.set(key, { status: 'ready', source: retained });
        this.evictOldestEntries();
        return this.clone(retained);
      }
      return this.clone(decoded);
    } catch (error: unknown) {
      if (this.entries.get(key) === pending) this.entries.delete(key);
      throw error;
    }
  }

  private keyFor(
    projectId: ProjectId,
    mimeType: SourceImageMimeType,
    maximumEdge: number | null,
    allowEmbeddedRawFallback: boolean,
    displayProfile: RawDisplayProfilePrimitives
  ): string {
    return `${projectId.valueOf()}:${mimeType}:${maximumEdge ?? 'full'}:${allowEmbeddedRawFallback ? 'fallback' : 'strict'}:${JSON.stringify(displayProfile)}`;
  }

  private clone(source: DecodedRenderSource): DecodedRenderSource {
    if (source.kind === 'bitmap') return { ...source };
    return { ...source, pixels: new Uint16Array(source.pixels) };
  }

  private touch(key: string, entry: ReadyEntry): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
  }

  private evictOldestEntries(): void {
    while (this.entries.size > this.maximumEntries) {
      const oldest = this.entries.entries().next().value;
      if (oldest === undefined) return;
      this.entries.delete(oldest[0]);
    }
  }
}
