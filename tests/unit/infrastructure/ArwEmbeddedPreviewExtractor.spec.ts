import { ArwEmbeddedPreviewExtractor } from '@/contexts/projects/infrastructure/codecs/ArwEmbeddedPreviewExtractor';

function arwFixture(): ArrayBuffer {
  const bytes = new Uint8Array(512);
  const view = new DataView(bytes.buffer);
  bytes.set([0x49, 0x49]);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  const entries = [
    { tag: 0x0100, type: 4, count: 1, value: 6000 },
    { tag: 0x0101, type: 4, count: 1, value: 4000 },
    { tag: 0x010f, type: 2, count: 5, value: 140 },
    { tag: 0x0110, type: 2, count: 6, value: 145 },
    { tag: 0x0112, type: 3, count: 1, value: 1 },
    { tag: 0x8769, type: 4, count: 1, value: 200 },
    { tag: 0x0201, type: 4, count: 1, value: 450 },
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
  bytes.set(new TextEncoder().encode('SONY\0'), 140);
  bytes.set(new TextEncoder().encode('A6600\0'), 145);

  const exifEntries = [
    { tag: 0x829a, type: 5, count: 1, value: 350 },
    { tag: 0x829d, type: 5, count: 1, value: 358 },
    { tag: 0x8827, type: 3, count: 1, value: 640 },
    { tag: 0x9003, type: 2, count: 20, value: 380 },
    { tag: 0x920a, type: 5, count: 1, value: 366 },
    { tag: 0xa001, type: 3, count: 1, value: 1 },
    { tag: 0xa403, type: 3, count: 1, value: 1 },
    { tag: 0xa434, type: 2, count: 16, value: 400 },
    { tag: 0x828e, type: 1, count: 4, value: 0x02010100 },
    { tag: 0xc61a, type: 5, count: 1, value: 420 },
    { tag: 0xc61d, type: 5, count: 1, value: 428 }
  ];
  view.setUint16(200, exifEntries.length, true);
  exifEntries.forEach((entry, index) => {
    const offset = 202 + index * 12;
    view.setUint16(offset, entry.tag, true);
    view.setUint16(offset + 2, entry.type, true);
    view.setUint32(offset + 4, entry.count, true);
    view.setUint32(offset + 8, entry.value, true);
  });
  view.setUint32(202 + exifEntries.length * 12, 0, true);
  [[350, 1, 125], [358, 28, 10], [366, 35, 1], [420, 512, 1], [428, 16_383, 1]].forEach(([offset = 0, numerator = 0, denominator = 1]) => {
    view.setUint32(offset, numerator, true);
    view.setUint32(offset + 4, denominator, true);
  });
  bytes.set(new TextEncoder().encode('2026:08:05 12:00:00\0'), 380);
  bytes.set(new TextEncoder().encode('E 35mm F1.8 OSS\0'), 400);
  bytes.set([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x02, 0x00, 0x03, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9
  ], 450);
  return bytes.buffer;
}

describe('ArwEmbeddedPreviewExtractor', () => {
  it('extracts a TIFF-linked JPEG preview and Sony metadata without decoding the RAW mosaic', () => {
    const result = new ArwEmbeddedPreviewExtractor().extract(arwFixture());

    expect(result.width).toBe(6000);
    expect(result.height).toBe(4000);
    expect(result.cameraMake).toBe('SONY');
    expect(result.cameraModel).toBe('A6600');
    expect(result.lensModel).toBe('E 35mm F1.8 OSS');
    expect(result.capturedAt).toBe('2026:08:05 12:00:00');
    expect(result.exposureTimeSeconds).toBeCloseTo(1 / 125);
    expect(result.apertureFNumber).toBe(2.8);
    expect(result.iso).toBe(640);
    expect(result.focalLengthMm).toBe(35);
    expect(result.orientation).toBe(1);
    expect(result.whiteBalance).toBe('manual');
    expect(result.colorSpace).toBe('srgb');
    expect(result.blackLevel).toBe(512);
    expect(result.whiteLevel).toBe(16_383);
    expect(result.cfaPattern).toBe('RGGB');
    expect(result.preview.type).toBe('image/jpeg');
    expect(result.preview.size).toBe(17);
  });

  it('rejects malformed data with an actionable error', () => {
    expect(() => new ArwEmbeddedPreviewExtractor().extract(new ArrayBuffer(8))).toThrow(/byte order marker/);
  });
});
