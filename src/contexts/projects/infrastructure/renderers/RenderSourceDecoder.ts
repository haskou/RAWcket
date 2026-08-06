import type { SourceImageMimeType } from '../../domain/SourceImageReference';
import type { ArwEmbeddedPreviewExtractor } from '../codecs/ArwEmbeddedPreviewExtractor';
import type { LibRawImageDecoder } from '../codecs/LibRawImageDecoder';
import { RawDisplayProfile, type RawDisplayProfilePrimitives } from '../../domain/RawDisplayProfile';

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
    displayProfile: RawDisplayProfilePrimitives;
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
    allowEmbeddedRawFallback: boolean,
    displayProfile: RawDisplayProfilePrimitives = RawDisplayProfile.neutral().toPrimitives()
  ): Promise<DecodedRenderSource> {
    if (mimeType !== 'image/x-sony-arw') {
      return { kind: 'bitmap', image: source, sourcePrecision: 'standard-8-bit', rawFallbackReason: null };
    }

    const sourceBuffer = await source.arrayBuffer();
    const cameraPreview = this.extractCameraPreview(sourceBuffer);
    try {
      if (sourceBuffer.byteLength < 64 * 1024) {
        throw new Error('The ARW container is too small to contain a complete sensor mosaic.');
      }
      const decoded = await this.libRaw.decode(sourceBuffer, maximumEdge);
      return {
        kind: 'raw-linear-16-bit',
        width: decoded.width,
        height: decoded.height,
        pixels: decoded.data,
        displayProfile: RawDisplayProfile.fromPrimitives(displayProfile).toPrimitives()
      };
    } catch (error: unknown) {
      if (!allowEmbeddedRawFallback) throw error;
      if (cameraPreview === null) throw error;
      return {
        kind: 'bitmap',
        image: cameraPreview,
        sourcePrecision: 'embedded-preview-8-bit',
        rawFallbackReason: error instanceof Error ? error.message : 'LibRaw returned an unknown error.'
      };
    }
  }

  private extractCameraPreview(sourceBuffer: ArrayBuffer): Blob | null {
    try {
      return this.embeddedPreview.extract(sourceBuffer).preview;
    } catch {
      return null;
    }
  }

}
