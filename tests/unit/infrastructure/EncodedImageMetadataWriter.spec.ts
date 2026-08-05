import { EncodedImageMetadataWriter } from '@/contexts/projects/infrastructure/renderers/EncodedImageMetadataWriter';

describe('EncodedImageMetadataWriter', () => {
  it('injects an XMP APP1 segment after the JPEG start marker', async () => {
    const output = await new EncodedImageMetadataWriter().write(
      new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }),
      'image/jpeg',
      '<x:xmpmeta>camera</x:xmpmeta>'
    );
    const bytes = new Uint8Array(await readBlob(output));
    const text = new TextDecoder().decode(bytes);

    expect([...bytes.slice(0, 4)]).toEqual([0xff, 0xd8, 0xff, 0xe1]);
    expect(text).toContain('http://ns.adobe.com/xap/1.0/');
    expect(text).toContain('<x:xmpmeta>camera</x:xmpmeta>');
    expect([...bytes.slice(-2)]).toEqual([0xff, 0xd9]);
  });

  it('injects a checksummed PNG iTXt XMP chunk after IHDR', async () => {
    const png = new Uint8Array(33);
    png.set([137, 80, 78, 71, 13, 10, 26, 10]);
    png.set([0, 0, 0, 13, 73, 72, 68, 82], 8);
    const output = await new EncodedImageMetadataWriter().write(new Blob([png], { type: 'image/png' }), 'image/png', '<xmp>camera</xmp>');
    const text = new TextDecoder().decode(await readBlob(output));

    expect(text).toContain('iTXtXML:com.adobe.xmp');
    expect(text).toContain('<xmp>camera</xmp>');
  });

  it('returns the original encoded blob when metadata is stripped', async () => {
    const source = new Blob(['same'], { type: 'image/jpeg' });
    expect(await new EncodedImageMetadataWriter().write(source, 'image/jpeg', null)).toBe(source);
  });
});

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('The encoded image could not be read.'));
    reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error('Expected binary image data.'));
    reader.readAsArrayBuffer(blob);
  });
}
