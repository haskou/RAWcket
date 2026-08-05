import { useState, type ReactElement } from 'react';
import type { PhotoExportFormat } from '@/contexts/projects/application/export-project-photo/messages/ExportProjectPhotoMessage';

export type PhotoExportSettings = {
  format: PhotoExportFormat;
  quality: number;
  maximumEdge: number | null;
};

export function ExportPhotoDialog({ open, busy, progress, message, onClose, onExport, onExportProject, onCancel }: {
  open: boolean;
  busy: boolean;
  progress: number;
  message: string;
  onClose: () => void;
  onExport: (settings: PhotoExportSettings) => void;
  onExportProject: () => void;
  onCancel: () => void;
}): ReactElement | null {
  const [format, setFormat] = useState<PhotoExportFormat>('jpeg');
  const [quality, setQuality] = useState(0.92);
  const [resize, setResize] = useState(false);
  const [maximumEdge, setMaximumEdge] = useState(4096);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={() => { if (!busy) onClose(); }}>
      <section className="dialog export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading"><div><span className="eyebrow">Developed output</span><h2 id="export-title">Export photo</h2></div><button className="icon-button" type="button" disabled={busy} onClick={onClose} aria-label="Close export">×</button></div>
        <label className="field-label" htmlFor="export-format">Format</label>
        <select id="export-format" value={format} disabled={busy} onChange={(event) => setFormat(event.target.value === 'png' ? 'png' : event.target.value === 'tiff' ? 'tiff' : 'jpeg')}><option value="jpeg">JPEG</option><option value="png">PNG</option><option value="tiff">TIFF · RGB 8-bit</option></select>
        {format === 'jpeg' && <div className="export-value-control"><div><label htmlFor="export-quality">Quality</label><input aria-label="Export quality numeric value" type="number" min={10} max={100} step={1} value={Math.round(quality * 100)} disabled={busy} onChange={(event) => setQuality(Math.min(1, Math.max(0.1, event.currentTarget.valueAsNumber / 100)))} /></div><input id="export-quality" type="range" min={0.1} max={1} step={0.01} value={quality} disabled={busy} onChange={(event) => setQuality(event.currentTarget.valueAsNumber)} /></div>}
        <label className="check-row"><input type="checkbox" checked={resize} disabled={busy} onChange={(event) => setResize(event.target.checked)} /> Limit longest edge</label>
        {resize && <div className="export-edge"><label htmlFor="export-edge">Longest edge</label><input id="export-edge" aria-label="Export longest edge" type="number" min={256} max={16384} step={1} value={maximumEdge} disabled={busy} onChange={(event) => setMaximumEdge(Math.min(16_384, Math.max(256, event.currentTarget.valueAsNumber)))} /><span>px</span></div>}
        <p className="muted">The original and complete non-destructive recipe are processed in a worker. JPEG uses the selected quality; PNG is lossless; TIFF is uncompressed RGB 8-bit while the reference pipeline remains 8-bit.</p>
        {busy && <progress className="export-progress" max={1} value={progress} aria-label="Photo export progress" />}
        <p className="status-copy" aria-live="polite">{message}</p>
        <div className="export-actions">
          <button className="button ghost" type="button" onClick={busy ? onCancel : onExportProject}>{busy ? 'Cancel export' : 'Export project bundle'}</button>
          <button className="button primary" type="button" disabled={busy} onClick={() => onExport({ format, quality, maximumEdge: resize ? maximumEdge : null })}>{busy ? 'Exporting…' : `Export ${format.toUpperCase()}`}</button>
        </div>
      </section>
    </div>
  );
}
