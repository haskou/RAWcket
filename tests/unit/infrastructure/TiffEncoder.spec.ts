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

  it('stores selected XMP metadata in TIFF tag 700', async () => {
    const blob = new TiffEncoder().encode(new Uint8ClampedArray([20, 30, 40, 255]), 1, 1, '<xmp>camera</xmp>');
    const bytes = new Uint8Array(await readBlob(blob));
    const view = new DataView(bytes.buffer);
    const entryCount = view.getUint16(8, true);
    const xmpEntry = 8 + 2 + (entryCount - 1) * 12;
    const xmpOffset = view.getUint32(xmpEntry + 8, true);
    const xmpLength = view.getUint32(xmpEntry + 4, true);

    expect(entryCount).toBe(11);
    expect(view.getUint16(xmpEntry, true)).toBe(700);
    expect(new TextDecoder().decode(bytes.slice(xmpOffset, xmpOffset + xmpLength))).toBe('<xmp>camera</xmp>');
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
