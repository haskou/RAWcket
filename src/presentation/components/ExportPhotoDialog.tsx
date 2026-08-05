import { useState, type ReactElement } from 'react';
import type { OutputSharpening, PhotoExportFormat, PhotoMetadataPolicy, PhotoWatermark, WatermarkPosition } from '@/contexts/projects/application/export-project-photo/messages/ExportProjectPhotoMessage';

export type PhotoExportSettings = {
  format: PhotoExportFormat;
  quality: number;
  maximumEdge: number | null;
  outputSharpening: OutputSharpening;
  watermark: PhotoWatermark | null;
  metadataPolicy: PhotoMetadataPolicy;
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
  const [outputSharpening, setOutputSharpening] = useState<OutputSharpening>('standard');
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.7);
  const [watermarkSize, setWatermarkSize] = useState(3);
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('bottom-right');
  const [metadataPolicy, setMetadataPolicy] = useState<PhotoMetadataPolicy>('strip');

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
        <label className="field-label" htmlFor="output-sharpening">Output sharpening</label>
        <select id="output-sharpening" value={outputSharpening} disabled={busy} onChange={(event) => setOutputSharpening(event.target.value as OutputSharpening)}><option value="none">None</option><option value="low">Low · screen</option><option value="standard">Standard · screen</option><option value="high">High · print</option></select>
        <label className="field-label" htmlFor="export-metadata">Metadata</label>
        <select id="export-metadata" value={metadataPolicy} disabled={busy} onChange={(event) => setMetadataPolicy(event.target.value as PhotoMetadataPolicy)}><option value="strip">Remove all metadata · private</option><option value="capture">Keep camera &amp; capture settings</option></select>
        {metadataPolicy === 'capture' && <p className="export-privacy-note">Keeps camera, lens, date, exposure, aperture, ISO, and focal length. Location, editing history, tags, filenames, and internal sensor data are never included.</p>}
        <label className="check-row"><input type="checkbox" checked={watermarkEnabled} disabled={busy} onChange={(event) => setWatermarkEnabled(event.target.checked)} /> Add text watermark</label>
        {watermarkEnabled && <div className="export-watermark">
          <label htmlFor="watermark-text">Watermark text</label><input id="watermark-text" type="text" maxLength={120} value={watermarkText} disabled={busy} onChange={(event) => setWatermarkText(event.target.value)} />
          <div className="export-value-control"><div><label htmlFor="watermark-opacity">Opacity</label><input aria-label="Watermark opacity numeric value" type="number" min={10} max={100} step={1} value={Math.round(watermarkOpacity * 100)} disabled={busy} onChange={(event) => setWatermarkOpacity(Math.min(1, Math.max(0.1, event.currentTarget.valueAsNumber / 100)))} /></div><input id="watermark-opacity" type="range" min={0.1} max={1} step={0.01} value={watermarkOpacity} disabled={busy} onChange={(event) => setWatermarkOpacity(event.currentTarget.valueAsNumber)} /></div>
          <div className="export-value-control"><div><label htmlFor="watermark-size">Size</label><input aria-label="Watermark size numeric value" type="number" min={1} max={10} step={0.1} value={watermarkSize} disabled={busy} onChange={(event) => setWatermarkSize(Math.min(10, Math.max(1, event.currentTarget.valueAsNumber)))} /></div><input id="watermark-size" type="range" min={1} max={10} step={0.1} value={watermarkSize} disabled={busy} onChange={(event) => setWatermarkSize(event.currentTarget.valueAsNumber)} /></div>
          <label htmlFor="watermark-position">Watermark position</label><select id="watermark-position" value={watermarkPosition} disabled={busy} onChange={(event) => setWatermarkPosition(event.target.value as WatermarkPosition)}><option value="bottom-left">Bottom left</option><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option></select>
        </div>}
        <p className="muted">The complete recipe is processed in a worker. Output sharpening runs after resize. Source metadata is removed by default. TIFF is uncompressed RGB 8-bit while the reference pipeline remains 8-bit.</p>
        {busy && <progress className="export-progress" max={1} value={progress} aria-label="Photo export progress" />}
        <p className="status-copy" aria-live="polite">{message}</p>
        <div className="export-actions">
          <button className="button ghost" type="button" onClick={busy ? onCancel : onExportProject}>{busy ? 'Cancel export' : 'Export project bundle'}</button>
          <button className="button primary" type="button" disabled={busy || (watermarkEnabled && watermarkText.trim().length === 0)} onClick={() => onExport({ format, quality, maximumEdge: resize ? maximumEdge : null, outputSharpening, metadataPolicy, watermark: watermarkEnabled ? { text: watermarkText, opacity: watermarkOpacity, sizePercent: watermarkSize, position: watermarkPosition } : null })}>{busy ? 'Exporting…' : `Export ${format.toUpperCase()}`}</button>
        </div>
      </section>
    </div>
  );
}
