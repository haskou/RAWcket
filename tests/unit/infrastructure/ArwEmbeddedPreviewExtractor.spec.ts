import { ArwEmbeddedPreviewExtractor } from '@/contexts/projects/infrastructure/codecs/ArwEmbeddedPreviewExtractor';

function arwFixture(): ArrayBuffer {
  const bytes = new Uint8Array(192);
  const view = new DataView(bytes.buffer);
  bytes.set([0x49, 0x49]);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  const entries = [
    { tag: 0x0100, type: 4, count: 1, value: 6000 },
    { tag: 0x0101, type: 4, count: 1, value: 4000 },
    { tag: 0x010f, type: 2, count: 5, value: 100 },
    { tag: 0x0110, type: 2, count: 6, value: 105 },
    { tag: 0x0201, type: 4, count: 1, value: 128 },
    { tag: 0x0202, type: 4, count: 1, value: 17 }
  ];
  view.setUint16(8, entries.length, true);
  entries.forEach((entry, index) => {
    const offset = 10 + index * 12;
    view.setUint16(offset, entry.tag, true);
    view.setUint16(offset + 2, entry.type, true);
    view.setUint32(offset + 4, entry.count, true);
    view.setUint32(offset + 8, entry.value, true);
  });
  view.setUint32(10 + entries.length * 12, 0, true);
  bytes.set(new TextEncoder().encode('SONY\0'), 100);
  bytes.set(new TextEncoder().encode('A6600\0'), 105);
  bytes.set([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x02, 0x00, 0x03, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9
  ], 128);
  return bytes.buffer;
}

describe('ArwEmbeddedPreviewExtractor', () => {
  it('extracts a TIFF-linked JPEG preview and Sony metadata without decoding the RAW mosaic', () => {
    const result = new ArwEmbeddedPreviewExtractor().extract(arwFixture());

    expect(result.width).toBe(6000);
    expect(result.height).toBe(4000);
    expect(result.cameraMake).toBe('SONY');
    expect(result.cameraModel).toBe('A6600');
    expect(result.preview.type).toBe('image/jpeg');
    expect(result.preview.size).toBe(17);
  });

  it('rejects malformed data with an actionable error', () => {
    expect(() => new ArwEmbeddedPreviewExtractor().extract(new ArrayBuffer(8))).toThrow(/byte order marker/);
  });
});
