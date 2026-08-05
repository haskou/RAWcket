import type { ReactElement } from 'react';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';

export function PhotoInformationDialog({ project, open, onClose }: {
  project: PhotoProject;
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
  const rows = candidates.filter(([, value]) => value.length > 0);

  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="dialog photo-information-dialog" role="dialog" aria-modal="true" aria-labelledby="photo-information-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="dialog-heading"><div><span className="eyebrow">Source facts</span><h2 id="photo-information-title">Photo information</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close photo information">×</button></div>
      <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {capture.cameraMake === null && <p className="muted">This source does not expose camera EXIF through RAWcket’s current safe browser decoder.</p>}
      {data.source.mimeType === 'image/x-sony-arw' && <p className="notice">The original ARW is preserved. RAWcket currently develops its embedded JPEG preview; full high-depth mosaic demosaicing is still pending and is not represented as complete.</p>}
    </section>
  </div>;
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
