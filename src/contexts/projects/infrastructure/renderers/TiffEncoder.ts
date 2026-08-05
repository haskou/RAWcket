export class TiffEncoder {
  private static readonly ENTRY_COUNT = 10;
  private static readonly IFD_OFFSET = 8;
  private static readonly BITS_PER_SAMPLE_OFFSET = TiffEncoder.IFD_OFFSET + 2 + TiffEncoder.ENTRY_COUNT * 12 + 4;
  private static readonly PIXEL_OFFSET = TiffEncoder.BITS_PER_SAMPLE_OFFSET + 6;

  public encode(rgba: Uint8ClampedArray, width: number, height: number): Blob {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
      throw new Error('TIFF dimensions must be positive integers.');
    }
    if (rgba.length !== width * height * 4) throw new Error('TIFF dimensions do not match the pixel buffer.');
    const byteCount = width * height * 3;
    const buffer = new ArrayBuffer(TiffEncoder.PIXEL_OFFSET + byteCount);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    bytes[0] = 0x49;
    bytes[1] = 0x49;
    view.setUint16(2, 42, true);
    view.setUint32(4, TiffEncoder.IFD_OFFSET, true);
    view.setUint16(TiffEncoder.IFD_OFFSET, TiffEncoder.ENTRY_COUNT, true);
    let entry = TiffEncoder.IFD_OFFSET + 2;
    entry = this.writeLong(view, entry, 256, width);
    entry = this.writeLong(view, entry, 257, height);
    entry = this.writeOffset(view, entry, 258, 3, TiffEncoder.BITS_PER_SAMPLE_OFFSET);
    entry = this.writeShort(view, entry, 259, 1);
    entry = this.writeShort(view, entry, 262, 2);
    entry = this.writeLong(view, entry, 273, TiffEncoder.PIXEL_OFFSET);
    entry = this.writeShort(view, entry, 277, 3);
    entry = this.writeLong(view, entry, 278, height);
    entry = this.writeLong(view, entry, 279, byteCount);
    entry = this.writeShort(view, entry, 284, 1);
    view.setUint32(entry, 0, true);
    view.setUint16(TiffEncoder.BITS_PER_SAMPLE_OFFSET, 8, true);
    view.setUint16(TiffEncoder.BITS_PER_SAMPLE_OFFSET + 2, 8, true);
    view.setUint16(TiffEncoder.BITS_PER_SAMPLE_OFFSET + 4, 8, true);
    let destination = TiffEncoder.PIXEL_OFFSET;
    for (let source = 0; source < rgba.length; source += 4) {
      bytes[destination] = rgba[source] ?? 0;
      bytes[destination + 1] = rgba[source + 1] ?? 0;
      bytes[destination + 2] = rgba[source + 2] ?? 0;
      destination += 3;
    }
    return new Blob([buffer], { type: 'image/tiff' });
  }

  private writeLong(view: DataView, offset: number, tag: number, value: number): number {
    view.setUint16(offset, tag, true);
    view.setUint16(offset + 2, 4, true);
    view.setUint32(offset + 4, 1, true);
    view.setUint32(offset + 8, value, true);
    return offset + 12;
  }

  private writeShort(view: DataView, offset: number, tag: number, value: number): number {
    view.setUint16(offset, tag, true);
    view.setUint16(offset + 2, 3, true);
    view.setUint32(offset + 4, 1, true);
    view.setUint16(offset + 8, value, true);
    view.setUint16(offset + 10, 0, true);
    return offset + 12;
  }

  private writeOffset(view: DataView, offset: number, tag: number, count: number, valueOffset: number): number {
    view.setUint16(offset, tag, true);
    view.setUint16(offset + 2, 3, true);
    view.setUint32(offset + 4, count, true);
    view.setUint32(offset + 8, valueOffset, true);
    return offset + 12;
  }
}
