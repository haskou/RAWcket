export class EncodedImageMetadataWriter {
  private readonly encoder = new TextEncoder();

  public async write(blob: Blob, mimeType: 'image/jpeg' | 'image/png', xmp: string | null): Promise<Blob> {
    if (xmp === null) return blob;
    const source = new Uint8Array(await this.readBlob(blob));
    return mimeType === 'image/jpeg' ? this.writeJpeg(source, xmp) : this.writePng(source, xmp);
  }

  private writeJpeg(source: Uint8Array, xmp: string): Blob {
    if (source[0] !== 0xff || source[1] !== 0xd8) throw new Error('JPEG metadata could not be attached to invalid bytes.');
    const namespace = this.encoder.encode('http://ns.adobe.com/xap/1.0/\0');
    const xml = this.encoder.encode(xmp);
    const payloadLength = namespace.length + xml.length;
    if (payloadLength > 65_533) throw new Error('The selected metadata exceeds the JPEG APP1 limit.');
    const segment = new Uint8Array(payloadLength + 4);
    segment[0] = 0xff;
    segment[1] = 0xe1;
    const storedLength = payloadLength + 2;
    segment[2] = storedLength >>> 8;
    segment[3] = storedLength & 0xff;
    segment.set(namespace, 4);
    segment.set(xml, 4 + namespace.length);
    return new Blob([source.slice(0, 2), segment, source.slice(2)], { type: 'image/jpeg' });
  }

  private writePng(source: Uint8Array, xmp: string): Blob {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!signature.every((value, index) => source[index] === value) || this.decoderText(source.slice(12, 16)) !== 'IHDR') {
      throw new Error('PNG metadata could not be attached to invalid bytes.');
    }
    const ihdrLength = this.readUint32(source, 8);
    const insertion = 8 + 12 + ihdrLength;
    if (insertion > source.length) throw new Error('PNG metadata could not be attached to truncated bytes.');
    const keyword = this.encoder.encode('XML:com.adobe.xmp');
    const xml = this.encoder.encode(xmp);
    const data = new Uint8Array(keyword.length + 5 + xml.length);
    data.set(keyword);
    data.set(xml, keyword.length + 5);
    const chunk = this.chunk('iTXt', data);
    return new Blob([source.slice(0, insertion), chunk, source.slice(insertion)], { type: 'image/png' });
  }

  private chunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
    const typeBytes = this.encoder.encode(type);
    const output = new Uint8Array(data.length + 12);
    this.writeUint32(output, 0, data.length);
    output.set(typeBytes, 4);
    output.set(data, 8);
    this.writeUint32(output, output.length - 4, this.crc32(output.slice(4, output.length - 4)));
    return output;
  }

  private crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private readUint32(bytes: Uint8Array, offset: number): number {
    return ((bytes[offset] ?? 0) * 0x1000000) + ((bytes[offset + 1] ?? 0) << 16) + ((bytes[offset + 2] ?? 0) << 8) + (bytes[offset + 3] ?? 0);
  }

  private writeUint32(bytes: Uint8Array, offset: number, value: number): void {
    bytes[offset] = value >>> 24;
    bytes[offset + 1] = value >>> 16;
    bytes[offset + 2] = value >>> 8;
    bytes[offset + 3] = value;
  }

  private decoderText(bytes: Uint8Array): string { return new TextDecoder().decode(bytes); }

  private readBlob(blob: Blob): Promise<ArrayBuffer> {
    if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The encoded photograph metadata could not be read.'));
      reader.onload = () => reader.result instanceof ArrayBuffer
        ? resolve(reader.result)
        : reject(new Error('The encoded photograph did not produce binary data.'));
      reader.readAsArrayBuffer(blob);
    });
  }
}
