import type { LibRawDecoderFactory } from '@/contexts/projects/infrastructure/codecs/LibRawImageDecoder';
import { LibRawImageDecoder } from '@/contexts/projects/infrastructure/codecs/LibRawImageDecoder';

describe('LibRawImageDecoder', () => {
  it('requests linear 16-bit camera-aware development and disposes LibRaw', async () => {
    const open = vi.fn(() => Promise.resolve());
    const dispose = vi.fn();
    const createDecoder: LibRawDecoderFactory = () => ({
      open,
      imageData: () => Promise.resolve({
        width: 2,
        height: 1,
        colors: 3,
        bits: 16,
        dataSize: 12,
        data: new Uint16Array([0, 1_024, 2_048, 65_535, 60_000, 55_000])
      }),
      dispose
    });

    const image = await new LibRawImageDecoder(createDecoder).decode(new ArrayBuffer(12), 2560);

    expect(open).toHaveBeenCalledWith(expect.any(Uint8Array), expect.objectContaining({
      outputBps: 16,
      outputColor: 1,
      useCameraWb: true,
      useCameraMatrix: 3,
      noAutoBright: true,
      gamm: [1, 1],
      halfSize: true
    }));
    expect(image.data).toEqual(new Uint16Array([0, 1_024, 2_048, 65_535, 60_000, 55_000]));
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('rejects non-16-bit output and still releases the decoder', async () => {
    const dispose = vi.fn();
    const createDecoder: LibRawDecoderFactory = () => ({
      open: () => Promise.resolve(),
      imageData: () => Promise.resolve({ width: 1, height: 1, colors: 3, bits: 8, dataSize: 3, data: new Uint8Array(3) }),
      dispose
    });

    await expect(new LibRawImageDecoder(createDecoder).decode(new ArrayBuffer(1), null)).rejects.toThrow(/required 16-bit/);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('times out a stalled decoder and terminates its resources', async () => {
    vi.useFakeTimers();
    const dispose = vi.fn();
    const createDecoder: LibRawDecoderFactory = () => ({
      open: () => new Promise(() => undefined),
      imageData: () => Promise.resolve(undefined),
      dispose
    });
    const pending = new LibRawImageDecoder(createDecoder, undefined, 100).decode(new ArrayBuffer(1), 2560);
    const rejection = expect(pending).rejects.toThrow(/decode limit/);
    await vi.advanceTimersByTimeAsync(100);
    await rejection;
    expect(dispose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
