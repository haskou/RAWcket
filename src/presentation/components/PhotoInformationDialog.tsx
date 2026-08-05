import type { ReactElement } from 'react';
import type { PreviewAnalysis } from '@/contexts/projects/application/ports/PreviewRenderer';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';

export function PhotoInformationDialog({ project, analysis, open, onClose }: {
  project: PhotoProject;
  analysis: PreviewAnalysis | null;
  open: boolean;
  onClose: () => void;
}): ReactElement | null {
  if (!open) return null;
  const data = project.toPrimitives();
  const capture = data.captureMetadata;
  const candidates: Array<[string, string]> = [
    ['File', data.source.fileName],
    ['Format', data.source.mimeType === 'image/x-sony-arw' ? 'Sony ARW' : data.source.mimeType.replace('image/', '').toUpperCase()],
    ['Dimensions', `${data.metadata.width} × ${data.metadata.height} px`],
    ['Camera', [capture.cameraMake, capture.cameraModel].filter(Boolean).join(' ')],
    ['Lens', capture.lensModel ?? ''],
    ['Captured', capture.capturedAt ?? ''],
    ['Exposure', capture.exposureTimeSeconds === null ? '' : formatExposure(capture.exposureTimeSeconds)],
    ['Aperture', capture.apertureFNumber === null ? '' : `f/${formatNumber(capture.apertureFNumber)}`],
    ['ISO', capture.iso === null ? '' : formatNumber(capture.iso)],
    ['Focal length', capture.focalLengthMm === null ? '' : `${formatNumber(capture.focalLengthMm)} mm`],
    ['White balance', capture.whiteBalance === null ? '' : capitalize(capture.whiteBalance)],
    ['Color space', capture.colorSpace === null ? '' : capture.colorSpace === 'srgb' ? 'sRGB' : capture.colorSpace === 'adobe-rgb' ? 'Adobe RGB' : 'Uncalibrated'],
    ['EXIF orientation', capture.orientation?.toString() ?? ''],
    ['Sensor levels', capture.blackLevel === null || capture.whiteLevel === null ? '' : `${formatNumber(capture.blackLevel)} black · ${formatNumber(capture.whiteLevel)} white`],
    ['Bayer/CFA pattern', capture.cfaPattern ?? '']
  ];
  if (data.source.mimeType === 'image/x-sony-arw') candidates.splice(3, 0, ['Development source', sourcePrecisionLabel(analysis)]);
  const rows = candidates.filter(([, value]) => value.length > 0);

  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="dialog photo-information-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-information-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="dialog-heading"><div><span className="eyebrow">Source facts</span><h2 id="photo-information-title">Photo information</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close photo information">×</button></div>
      <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {capture.cameraMake === null && <p className="muted">This source does not expose camera EXIF through RAWcket’s current safe browser decoder.</p>}
      {data.source.mimeType === 'image/x-sony-arw' && analysis?.sourcePrecision === 'raw-linear-16-bit' && <p className="notice">The original ARW sensor mosaic was demosaiced by LibRaw/WASM with camera white balance and its color matrix, then developed from a 16-bit linear RGB buffer. Quantization to 8-bit occurs only when the displayed preview is encoded.</p>}
      {data.source.mimeType === 'image/x-sony-arw' && analysis?.sourcePrecision === 'embedded-preview-8-bit' && <p className="notice warning"><strong>Embedded 8-bit preview fallback.</strong> The original ARW is preserved, but LibRaw could not complete this interactive decode. {analysis.rawFallbackReason ?? 'No decoder reason was returned.'} Final export will not silently use this fallback.</p>}
      {data.source.mimeType === 'image/x-sony-arw' && analysis === null && <p className="notice">The original ARW is preserved. RAWcket is still determining whether this frame can use the 16-bit LibRaw pipeline.</p>}
    </section>
  </div>;
}

function sourcePrecisionLabel(analysis: PreviewAnalysis | null): string {
  if (analysis === null) return 'Determining source precision…';
  if (analysis.sourcePrecision === 'raw-linear-16-bit') return 'LibRaw/WASM · linear RGB · 16-bit';
  if (analysis.sourcePrecision === 'embedded-preview-8-bit') return 'Embedded JPEG fallback · 8-bit';
  return 'Browser-decoded source · 8-bit';
}

function formatExposure(seconds: number): string {
  if (seconds >= 1) return `${formatNumber(seconds)} s`;
  const denominator = Math.round(1 / seconds);
  return denominator > 1 ? `1/${denominator} s` : `${formatNumber(seconds)} s`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function capitalize(value: string): string {
  return `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`;
}
