import type { SourceImageMimeType } from '../../domain/SourceImageReference';
import type { ArwEmbeddedPreviewExtractor } from '../codecs/ArwEmbeddedPreviewExtractor';
import type { LibRawImageDecoder } from '../codecs/LibRawImageDecoder';

type HighDepthRawDecoder = Pick<LibRawImageDecoder, 'decode'>;
type EmbeddedRawPreviewExtractor = Pick<ArwEmbeddedPreviewExtractor, 'extract'>;

export type DecodedRenderSource =
  | {
    kind: 'bitmap';
    image: Blob;
    sourcePrecision: 'standard-8-bit' | 'embedded-preview-8-bit';
    rawFallbackReason: string | null;
  }
  | {
    kind: 'raw-linear-16-bit';
    width: number;
    height: number;
    pixels: Uint16Array<ArrayBuffer>;
  };

export class RenderSourceDecoder {
  public constructor(
    private readonly libRaw: HighDepthRawDecoder,
    private readonly embeddedPreview: EmbeddedRawPreviewExtractor
  ) {}

  public async decode(
    source: Blob,
    mimeType: SourceImageMimeType,
    maximumEdge: number | null,
    allowEmbeddedRawFallback: boolean
  ): Promise<DecodedRenderSource> {
    if (mimeType !== 'image/x-sony-arw') {
      return { kind: 'bitmap', image: source, sourcePrecision: 'standard-8-bit', rawFallbackReason: null };
    }

    const sourceBuffer = await source.arrayBuffer();
    try {
      if (sourceBuffer.byteLength < 64 * 1024) {
        throw new Error('The ARW container is too small to contain a complete sensor mosaic.');
      }
      const decoded = await this.libRaw.decode(sourceBuffer, maximumEdge);
      return {
        kind: 'raw-linear-16-bit',
        width: decoded.width,
        height: decoded.height,
        pixels: decoded.data
      };
    } catch (error: unknown) {
      if (!allowEmbeddedRawFallback) throw error;
      return {
        kind: 'bitmap',
        image: this.embeddedPreview.extract(sourceBuffer).preview,
        sourcePrecision: 'embedded-preview-8-bit',
        rawFallbackReason: error instanceof Error ? error.message : 'LibRaw returned an unknown error.'
      };
    }
  }
}
