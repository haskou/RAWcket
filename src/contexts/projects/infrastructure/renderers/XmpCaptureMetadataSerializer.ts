import type { CaptureMetadataPrimitives } from '../../domain/CaptureMetadata';

export class XmpCaptureMetadataSerializer {
  public serialize(metadata: CaptureMetadataPrimitives): string | null {
    const attributes = this.attributes(metadata);
    if (attributes.length === 0) return null;
    return `<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/">\n  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n    <rdf:Description rdf:about="" xmlns:tiff="http://ns.adobe.com/tiff/1.0/" xmlns:exif="http://ns.adobe.com/exif/1.0/" ${attributes.join(' ')} />\n  </rdf:RDF>\n</x:xmpmeta>\n<?xpacket end="w"?>`;
  }

  private attributes(metadata: CaptureMetadataPrimitives): string[] {
    const attributes: string[] = [];
    this.push(attributes, 'tiff:Make', metadata.cameraMake);
    this.push(attributes, 'tiff:Model', metadata.cameraModel);
    this.push(attributes, 'exif:Lens', metadata.lensModel);
    this.push(attributes, 'exif:DateTimeOriginal', metadata.capturedAt);
    this.push(attributes, 'exif:ExposureTime', this.rational(metadata.exposureTimeSeconds));
    this.push(attributes, 'exif:FNumber', this.rational(metadata.apertureFNumber));
    this.push(attributes, 'exif:ISOSpeedRatings', metadata.iso === null ? null : String(metadata.iso));
    this.push(attributes, 'exif:FocalLength', this.rational(metadata.focalLengthMm));
    return attributes;
  }

  private push(attributes: string[], name: string, value: string | null): void {
    if (value !== null) attributes.push(`${name}="${this.escape(value)}"`);
  }

  private rational(value: number | null): string | null {
    if (value === null) return null;
    const denominator = value < 1 ? 1_000_000 : 1_000;
    const numerator = Math.max(1, Math.round(value * denominator));
    const divisor = this.greatestCommonDivisor(numerator, denominator);
    return `${numerator / divisor}/${denominator / divisor}`;
  }

  private greatestCommonDivisor(left: number, right: number): number {
    let a = left;
    let b = right;
    while (b !== 0) [a, b] = [b, a % b];
    return a;
  }

  private escape(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }
}
