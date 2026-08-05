import LibRaw, { type LibRawImageData, type LibRawSettings } from 'libraw-wasm';
import { HighDepthImageScaler, type HighDepthRgbImage } from './HighDepthImageScaler';

type LibRawDecoder = {
  open(bytes: BufferSource, settings?: LibRawSettings): Promise<void>;
  imageData(): Promise<LibRawImageData | undefined>;
  dispose(): void;
};

export type LibRawDecoderFactory = () => LibRawDecoder;

export class LibRawImageDecoder {
  private static readonly MAXIMUM_INPUT_BYTES = 256 * 1024 * 1024;
  private static readonly MAXIMUM_DECODED_PIXELS = 60_000_000;

  public constructor(
    private readonly createDecoder: LibRawDecoderFactory = () => new LibRaw(),
    private readonly scaler = new HighDepthImageScaler(),
    private readonly decodeTimeoutMilliseconds = 45_000
  ) {}

  public async decode(source: ArrayBuffer, maximumEdge: number | null): Promise<HighDepthRgbImage> {
    if (source.byteLength === 0) throw new Error('The RAW original is empty.');
    if (source.byteLength > LibRawImageDecoder.MAXIMUM_INPUT_BYTES) {
      throw new Error('The RAW original exceeds RAWcket’s 256 MB decode limit.');
    }
    const decoder = this.createDecoder();
    try {
      const decoded = await this.withTimeout(async () => {
        await decoder.open(new Uint8Array(source), this.settings(maximumEdge));
        return decoder.imageData();
      });
      if (decoded === undefined) throw new Error('LibRaw did not return a developed image.');
      if (decoded.bits !== 16 || !(decoded.data instanceof Uint16Array)) {
        throw new Error('LibRaw did not return the required 16-bit pixel buffer.');
      }
      if (decoded.colors !== 3) {
        throw new Error(`LibRaw returned an unsupported ${decoded.colors}-channel image.`);
      }
      if (!Number.isSafeInteger(decoded.width) || !Number.isSafeInteger(decoded.height) || decoded.width <= 0 || decoded.height <= 0) {
        throw new Error('LibRaw returned invalid image dimensions.');
      }
      if (decoded.width * decoded.height > LibRawImageDecoder.MAXIMUM_DECODED_PIXELS) {
        throw new Error('The developed RAW exceeds RAWcket’s 60 megapixel memory limit. Export a resized image or use a lower-memory device mode.');
      }
      const pixels = new Uint16Array(decoded.data);
      return this.scaler.resize({
        width: decoded.width,
        height: decoded.height,
        channels: decoded.colors,
        bitDepth: 16,
        data: pixels
      }, maximumEdge);
    } catch (error: unknown) {
      throw new Error(`High-depth RAW decoding failed: ${error instanceof Error ? error.message : 'LibRaw returned an unknown error.'}`);
    } finally {
      decoder.dispose();
    }
  }

  private settings(maximumEdge: number | null): LibRawSettings {
    return {
      outputBps: 16,
      outputColor: 1,
      useCameraWb: true,
      useCameraMatrix: 3,
      noAutoBright: true,
      adjustMaximumThr: 0,
      gamm: [1, 1],
      userQual: 3,
      halfSize: maximumEdge !== null && maximumEdge <= 3072
    };
  }

  private async withTimeout<T>(operation: () => Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error(`LibRaw exceeded the ${Math.ceil(this.decodeTimeoutMilliseconds / 1000)} second decode limit.`)), this.decodeTimeoutMilliseconds);
        })
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
}
