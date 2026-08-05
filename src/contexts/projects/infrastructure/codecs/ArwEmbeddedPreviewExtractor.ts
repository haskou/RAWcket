export type ArwPreview = {
  preview: Blob;
  width: number;
  height: number;
  cameraMake: string | null;
  cameraModel: string | null;
};

type IfdValues = Map<number, number[]>;

export class ArwEmbeddedPreviewExtractor {
  public extract(buffer: ArrayBuffer): ArwPreview {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    if (bytes.byteLength < 8) throw new Error('The ARW file is too small to contain a TIFF header.');
    const marker = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0);
    const littleEndian = marker === 'II';
    if (!littleEndian && marker !== 'MM') throw new Error('The ARW byte order marker is invalid.');
    if (view.getUint16(2, littleEndian) !== 42) throw new Error('The ARW TIFF signature is invalid.');

    const candidates: Array<{ offset: number; length: number }> = [];
    const visited = new Set<number>();
    let rawWidth = 0;
    let rawHeight = 0;
    let cameraMake: string | null = null;
    let cameraModel: string | null = null;

    const readIfd = (offset: number): void => {
      if (visited.has(offset) || offset <= 0 || offset + 2 > bytes.byteLength || visited.size >= 64) return;
      visited.add(offset);
      const entryCount = view.getUint16(offset, littleEndian);
      if (entryCount > 4096 || offset + 2 + entryCount * 12 + 4 > bytes.byteLength) return;
      const values: IfdValues = new Map();
      for (let index = 0; index < entryCount; index += 1) {
        const entryOffset = offset + 2 + index * 12;
        const tag = view.getUint16(entryOffset, littleEndian);
        const type = view.getUint16(entryOffset + 2, littleEndian);
        const count = view.getUint32(entryOffset + 4, littleEndian);
        const numeric = this.numericValues(view, bytes.byteLength, entryOffset, type, count, littleEndian);
        if (numeric.length > 0) values.set(tag, numeric);
        if (tag === 0x010f || tag === 0x0110) {
          const text = this.asciiValue(view, bytes, entryOffset, type, count, littleEndian);
          if (tag === 0x010f && text !== null) cameraMake = text;
          if (tag === 0x0110 && text !== null) cameraModel = text;
        }
      }
      rawWidth = Math.max(rawWidth, values.get(0x0100)?.[0] ?? 0);
      rawHeight = Math.max(rawHeight, values.get(0x0101)?.[0] ?? 0);
      const jpegOffset = values.get(0x0201)?.[0];
      const jpegLength = values.get(0x0202)?.[0];
      if (jpegOffset !== undefined && jpegLength !== undefined && this.isJpegRange(bytes, jpegOffset, jpegLength)) {
        candidates.push({ offset: jpegOffset, length: jpegLength });
      }
      for (const child of [...values.get(0x014a) ?? [], ...values.get(0x8769) ?? []]) readIfd(child);
      const nextOffset = view.getUint32(offset + 2 + entryCount * 12, littleEndian);
      readIfd(nextOffset);
    };

    readIfd(view.getUint32(4, littleEndian));
    if (candidates.length === 0) {
      const scanned = this.scanForLargestJpeg(bytes);
      if (scanned !== null) candidates.push(scanned);
    }
    const selected = candidates.sort((left, right) => right.length - left.length)[0];
    if (selected === undefined) throw new Error('The ARW file does not contain a readable embedded JPEG preview.');
    const jpeg = bytes.slice(selected.offset, selected.offset + selected.length);
    const dimensions = this.jpegDimensions(jpeg);
    return {
      preview: new Blob([jpeg], { type: 'image/jpeg' }),
      width: rawWidth || dimensions.width,
      height: rawHeight || dimensions.height,
      cameraMake,
      cameraModel
    };
  }

  private numericValues(
    view: DataView,
    byteLength: number,
    entryOffset: number,
    type: number,
    count: number,
    littleEndian: boolean
  ): number[] {
    const bytesPerValue = type === 3 ? 2 : type === 4 ? 4 : 0;
    if (bytesPerValue === 0 || count === 0 || count > 1024) return [];
    const total = bytesPerValue * count;
    const valueOffset = total <= 4 ? entryOffset + 8 : view.getUint32(entryOffset + 8, littleEndian);
    if (valueOffset < 0 || valueOffset + total > byteLength) return [];
    return Array.from({ length: count }, (_, index) => type === 3
      ? view.getUint16(valueOffset + index * 2, littleEndian)
      : view.getUint32(valueOffset + index * 4, littleEndian));
  }

  private asciiValue(
    view: DataView,
    bytes: Uint8Array,
    entryOffset: number,
    type: number,
    count: number,
    littleEndian: boolean
  ): string | null {
    if (type !== 2 || count === 0 || count > 1024) return null;
    const valueOffset = count <= 4 ? entryOffset + 8 : view.getUint32(entryOffset + 8, littleEndian);
    if (valueOffset + count > bytes.byteLength) return null;
    const text = new TextDecoder().decode(bytes.slice(valueOffset, valueOffset + count)).replace(/\0+$/, '').trim();
    return text.length === 0 ? null : text;
  }

  private isJpegRange(bytes: Uint8Array, offset: number, length: number): boolean {
    return offset >= 0 && length >= 4 && offset + length <= bytes.byteLength && bytes[offset] === 0xff && bytes[offset + 1] === 0xd8;
  }

  private scanForLargestJpeg(bytes: Uint8Array): { offset: number; length: number } | null {
    let best: { offset: number; length: number } | null = null;
    let start = -1;
    for (let index = 0; index < bytes.length - 1; index += 1) {
      if (start < 0 && bytes[index] === 0xff && bytes[index + 1] === 0xd8) start = index;
      if (start >= 0 && bytes[index] === 0xff && bytes[index + 1] === 0xd9) {
        const candidate = { offset: start, length: index + 2 - start };
        if (best === null || candidate.length > best.length) best = candidate;
        start = -1;
      }
    }
    return best;
  }

  private jpegDimensions(bytes: Uint8Array): { width: number; height: number } {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1] ?? 0;
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const length = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
      if (length < 2 || offset + 2 + length > bytes.length) break;
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
        return {
          height: ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0),
          width: ((bytes[offset + 7] ?? 0) << 8) | (bytes[offset + 8] ?? 0)
        };
      }
      offset += 2 + length;
    }
    throw new Error('The embedded ARW preview does not contain valid JPEG dimensions.');
  }
}
