import type { ReactElement } from 'react';
import type {
  SemanticModelDescriptor,
  SemanticModelStatus
} from '@/contexts/projects/application/ports/SemanticSegmentationModel';
import type { SemanticMaskCategoryPrimitive } from '@/contexts/projects/domain/value-objects/SemanticMaskCategory';

export type SemanticModelUiStatus = SemanticModelStatus | 'checking';
export type SemanticModelTask = 'installing' | 'segmenting' | null;

const categoryLabels: Record<SemanticMaskCategoryPrimitive, string> = {
  sky: 'Sky',
  water: 'Water',
  vegetation: 'Vegetation',
  people: 'People',
  buildings: 'Buildings'
};

export function SemanticMaskControls({
  descriptor,
  status,
  task,
  progress,
  category,
  message,
  previewAvailable,
  onCategoryChange,
  onInstall,
  onCancel,
  onRemove,
  onGenerate,
  onCreatePointMask
}: {
  descriptor: SemanticModelDescriptor;
  status: SemanticModelUiStatus;
  task: SemanticModelTask;
  progress: number;
  category: SemanticMaskCategoryPrimitive;
  message: string;
  previewAvailable: boolean;
  onCategoryChange: (category: SemanticMaskCategoryPrimitive) => void;
  onInstall: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onGenerate: () => void;
  onCreatePointMask: () => void;
}): ReactElement {
  const megabytes = (descriptor.approximateDownloadBytes / 1_000_000).toFixed(1);
  const busy = task !== null;

  return <div className="semantic-mask-controls" role="region" aria-label="Local semantic masks">
    <div className="semantic-mask-heading">
      <span className="ai-orb small" aria-hidden="true">✦</span>
      <span><strong>Semantic Select</strong><small>On-device segmentation · prepared automatically</small></span>
    </div>
    <p>Select sky, water, vegetation, people, or buildings without uploading the photograph.</p>

    {status === 'checking' && <p className="semantic-model-status">Checking the local model…</p>}
    {status === 'unavailable' && <p className="semantic-model-status warning">This browser cannot securely store and verify the model. Point-guided and manual masks remain available.</p>}
    {status === 'not-installed' && <div className="semantic-model-consent">
      <dl>
        <div><dt>Source</dt><dd>{descriptor.id}</dd></div>
        <div><dt>Version</dt><dd>{descriptor.version.slice(0, 12)}</dd></div>
        <div><dt>Model</dt><dd>≈ {megabytes} MB download</dd></div>
        <div><dt>Fallback</dt><dd>Up to 21.6 MB WASM runtime</dd></div>
        <div><dt>Storage</dt><dd>Browser cache on this device</dd></div>
      </dl>
      <p>RAWcket downloads these pinned weights automatically, verifies every file against its SHA-256 hash, and blocks semantic selection until the model is ready.</p>
      <a href={`https://huggingface.co/${descriptor.id}`} target="_blank" rel="noreferrer">Review model card and terms ↗</a>
      {task === null && <button className="button ai-primary full" type="button" onClick={onInstall}>Retry local model download</button>}
    </div>}

    {status === 'installed' && <div className="semantic-model-ready">
      <label className="field-label" htmlFor="semantic-mask-category">Select a subject category</label>
      <select id="semantic-mask-category" value={category} disabled={busy} onChange={(event) => onCategoryChange(event.target.value as SemanticMaskCategoryPrimitive)}>
        {descriptor.supportedCategories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
      </select>
      <button className="button ai-primary full" type="button" disabled={busy || !previewAvailable} onClick={onGenerate}>Generate semantic mask</button>
      <button className="button danger-link full" type="button" disabled={busy} onClick={onRemove}>Clear downloaded model</button>
    </div>}

    {busy && <div className="semantic-progress">
      <progress max={1} value={progress} aria-label={task === 'installing' ? 'Model download progress' : 'Semantic mask progress'} />
      <span>{task === 'installing' ? 'Downloading and verifying' : 'Segmenting locally'} · {Math.round(progress * 100)}%</span>
      {task === 'segmenting' && <button className="button ghost full" type="button" onClick={onCancel}>Cancel segmentation</button>}
    </div>}
    <p className="semantic-model-message" aria-live="polite">{message}</p>

    <div className="smart-point-fallback">
      <span><strong>Point-guided Smart Mask</strong><small>No model download required</small></span>
      <button className="button ghost full" type="button" disabled={busy} onClick={onCreatePointMask}>Create and place points</button>
    </div>
  </div>;
}
