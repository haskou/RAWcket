import { RenderSourceDecoder } from '@/contexts/projects/infrastructure/renderers/RenderSourceDecoder';
import { RawDisplayProfile } from '@/contexts/projects/domain/RawDisplayProfile';

const neutralProfile = RawDisplayProfile.neutral().toPrimitives();

describe('RenderSourceDecoder', () => {
  it('keeps ordinary bitmap sources on the standard precision path', async () => {
    const source = new Blob(['jpeg'], { type: 'image/jpeg' });
    const decode = vi.fn();
    const extract = vi.fn();
    const result = await new RenderSourceDecoder({ decode }, { extract }).decode(source, 'image/jpeg', 2560, true);

    expect(result).toEqual({ kind: 'bitmap', image: source, sourcePrecision: 'standard-8-bit', rawFallbackReason: null });
    expect(decode).not.toHaveBeenCalled();
    expect(extract).not.toHaveBeenCalled();
  });

  it('returns transferable linear 16-bit pixels when LibRaw develops the sensor mosaic', async () => {
    const pixels = new Uint16Array([0, 32_768, 65_535]);
    const decode = vi.fn().mockResolvedValue({ width: 1, height: 1, channels: 3, bitDepth: 16, data: pixels });
    const preview = new Blob(['camera-preview'], { type: 'image/jpeg' });
    const extract = vi.fn().mockReturnValue({ preview });
    const displayProfile = { ...neutralProfile, redGain: 1.05, chroma: 1.2 };
    const result = await new RenderSourceDecoder({ decode }, { extract }).decode(
      rawBlob(),
      'image/x-sony-arw',
      2560,
      true,
      displayProfile
    );

    expect(result).toEqual({ kind: 'raw-linear-16-bit', width: 1, height: 1, pixels, displayProfile });
    expect(extract).toHaveBeenCalledTimes(1);
  });

  it('keeps high-depth RAW decoding when camera-preview calibration is unavailable', async () => {
    const pixels = new Uint16Array([0, 32_768, 65_535]);
    const decode = vi.fn().mockResolvedValue({ width: 1, height: 1, channels: 3, bitDepth: 16, data: pixels });
    const extract = vi.fn().mockImplementation(() => { throw new Error('No camera preview'); });

    const result = await new RenderSourceDecoder({ decode }, { extract }).decode(
      rawBlob(), 'image/x-sony-arw', 2560, true
    );

    expect(result).toEqual({ kind: 'raw-linear-16-bit', width: 1, height: 1, pixels, displayProfile: neutralProfile });
  });

  it('uses an explicit embedded preview fallback only when the caller permits it', async () => {
    const preview = new Blob(['embedded'], { type: 'image/jpeg' });
    const decode = vi.fn().mockRejectedValue(new Error('Unsupported camera'));
    const extract = vi.fn().mockReturnValue({ preview, start: 10, end: 18 });
    const decoder = new RenderSourceDecoder({ decode }, { extract });
    const source = rawBlob();

    await expect(decoder.decode(source, 'image/x-sony-arw', 2560, true)).resolves.toEqual({
      kind: 'bitmap', image: preview, sourcePrecision: 'embedded-preview-8-bit', rawFallbackReason: 'Unsupported camera'
    });
    await expect(decoder.decode(source, 'image/x-sony-arw', null, false)).rejects.toThrow('Unsupported camera');
    expect(extract).toHaveBeenCalledTimes(2);
  });

  it('extracts the fallback before LibRaw can transfer and detach the source buffer', async () => {
    const preview = new Blob(['embedded'], { type: 'image/jpeg' });
    const extract = vi.fn((buffer: ArrayBuffer) => {
      new Uint8Array(buffer, 0, 4);
      return {
        preview,
        width: 1,
        height: 1,
        cameraMake: null,
        cameraModel: null,
        lensModel: null,
        capturedAt: null,
        exposureTimeSeconds: null,
        apertureFNumber: null,
        iso: null,
        focalLengthMm: null,
        orientation: null,
        whiteBalance: null,
        colorSpace: null,
        blackLevel: null,
        whiteLevel: null,
        cfaPattern: null
      };
    });
    const decode = vi.fn((buffer: ArrayBuffer) => {
      structuredClone(buffer, { transfer: [buffer] });
      return Promise.resolve({
        width: 1,
        height: 1,
        channels: 3 as const,
        bitDepth: 16 as const,
        data: new Uint16Array([1, 2, 3])
      });
    });

    await expect(new RenderSourceDecoder({ decode }, { extract }).decode(
      rawBlob(), 'image/x-sony-arw', 2_560, true
    )).resolves.toMatchObject({ kind: 'raw-linear-16-bit' });

    expect(extract.mock.invocationCallOrder[0]).toBeLessThan(decode.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER);
  });
});

function rawBlob(): Blob {
  const blob = new Blob([new Uint8Array(64 * 1024)], { type: 'image/x-sony-arw' });
  Object.defineProperty(blob, 'arrayBuffer', { value: () => Promise.resolve(new ArrayBuffer(64 * 1024)) });
  return blob;
}
