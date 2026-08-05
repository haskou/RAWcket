import { RenderSourceDecoder } from '@/contexts/projects/infrastructure/renderers/RenderSourceDecoder';

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

    const result = await new RenderSourceDecoder({ decode }, { extract: vi.fn() }).decode(
      rawBlob(),
      'image/x-sony-arw',
      2560,
      true
    );

    expect(result).toEqual({ kind: 'raw-linear-16-bit', width: 1, height: 1, pixels });
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
    expect(extract).toHaveBeenCalledTimes(1);
  });
});

function rawBlob(): Blob {
  const blob = new Blob([new Uint8Array(64 * 1024)], { type: 'image/x-sony-arw' });
  Object.defineProperty(blob, 'arrayBuffer', { value: () => Promise.resolve(new ArrayBuffer(64 * 1024)) });
  return blob;
}
