import { TiffEncoder } from '@/contexts/projects/infrastructure/renderers/TiffEncoder';

describe('TiffEncoder', () => {
  it('encodes baseline little-endian uncompressed RGB pixels with matching MIME bytes', async () => {
    const blob = new TiffEncoder().encode(new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 128, 255, 64
    ]), 2, 1);
    const bytes = new Uint8Array(await readBlob(blob));
    const view = new DataView(bytes.buffer);

    expect(blob.type).toBe('image/tiff');
    expect([...bytes.slice(0, 4)]).toEqual([0x49, 0x49, 42, 0]);
    expect(view.getUint32(4, true)).toBe(8);
    expect(view.getUint16(8, true)).toBe(10);
    expect([...bytes.slice(-6)]).toEqual([255, 0, 0, 0, 128, 255]);
  });

  it('rejects a buffer that does not match its dimensions', () => {
    expect(() => new TiffEncoder().encode(new Uint8ClampedArray(4), 2, 1)).toThrow(/do not match/);
  });
});

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The test TIFF could not be read.'));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('The test TIFF did not produce binary data.'));
    };
    reader.readAsArrayBuffer(blob);
  });
}
