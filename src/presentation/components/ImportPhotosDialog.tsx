import { useEffect, useState, type DragEvent, type ReactElement } from 'react';
import type { SemanticModelDescriptor, SemanticModelStatus } from '@/contexts/projects/application/ports/SemanticSegmentationModel';

type ImportPhotosDialogProps = {
  open: boolean;
  busy: boolean;
  automaticTags: boolean;
  model: SemanticModelDescriptor;
  modelStatus: SemanticModelStatus | 'checking';
  installingModel: boolean;
  modelProgress: number;
  modelMessage: string;
  onClose: () => void;
  onBrowse: () => void;
  onFiles: (files: File[]) => void;
  onAutomaticTagsChange: (enabled: boolean) => void;
  onInstallModel: () => void;
};

export function ImportPhotosDialog(props: ImportPhotosDialogProps): ReactElement | null {
  const [dragActive, setDragActive] = useState(false);
  const modelPreparing = props.modelStatus === 'checking' || props.installingModel;

  useEffect(() => {
    if (props.open) return;
    setDragActive(false);
  }, [props.open]);

  if (!props.open) return null;

  const dragOver = (event: DragEvent<HTMLDivElement>): void => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = props.busy || modelPreparing ? 'none' : 'copy';
    setDragActive(true);
  };
  const drop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (!props.busy && !modelPreparing) props.onFiles([...event.dataTransfer.files]);
  };

  return <div className="dialog-backdrop" role="presentation" onMouseDown={props.onClose}>
    <section className="dialog import-photos-dialog" role="dialog" aria-modal="true" aria-labelledby="import-photos-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="dialog-heading">
        <div><span className="eyebrow">Local-first import</span><h2 id="import-photos-title">Import photographs</h2></div>
        <button className="icon-button" type="button" onClick={props.onClose} aria-label="Close import">×</button>
      </div>
      <div
        className={`import-dialog-dropzone ${dragActive ? 'active' : ''}`}
        onDragEnter={dragOver}
        onDragOver={dragOver}
        onDragLeave={(event) => { event.stopPropagation(); setDragActive(false); }}
        onDrop={drop}
      >
        <span className="drop-target-icon" aria-hidden="true">↓</span>
        <strong>Drop photographs here</strong>
        <p>JPEG, PNG, or Sony ARW. Drop several files and AI Companion can compare their post-edit potential before you choose one.</p>
        <button className="button primary" type="button" disabled={props.busy || modelPreparing} onClick={props.onBrowse}>{modelPreparing ? `Preparing Local AI · ${Math.round(props.modelProgress * 100)}%` : 'Choose photographs'}</button>
        <small>Originals stay untouched and are stored only in this browser.</small>
      </div>
      <section className="local-tagging-card" aria-label="Automatic local tags">
        <div><strong>Automatic local tags</strong><small>{props.model.id} · pinned {props.model.version.slice(0, 12)}</small></div>
        {props.modelStatus === 'checking' ? <p>Checking the verified local tagging model…</p> : props.modelStatus === 'installed' ? <>
          <label className="check-row"><input type="checkbox" checked={props.automaticTags} onChange={(event) => props.onAutomaticTagsChange(event.target.checked)} /> Add tags automatically on import</label>
          <p>Runs locally after selection. It can add: {props.model.supportedCategories.join(', ')}. You can edit or remove every tag.</p>
        </> : props.modelStatus === 'not-installed' ? <>
          <p>RAWcket automatically downloads the {formatBytes(props.model.approximateDownloadBytes)} semantic model used for: {props.model.supportedCategories.join(', ')}.</p>
          <p>Weights come from Hugging Face, are pinned and SHA-256 verified, and import stays blocked until they are ready. Inference runs on-device through WebGPU or a WASM fallback of up to 21.6 MB.</p>
          <a href={`https://huggingface.co/${props.model.id}`} target="_blank" rel="noreferrer">Review model card and terms ↗</a>
          {props.installingModel && <progress max={1} value={props.modelProgress} aria-label="Local tag model download progress" />}
          {!props.installingModel && <button className="button ghost full" type="button" onClick={props.onInstallModel}>Retry local model download</button>}
        </> : <p>This browser cannot install the verified local tag model. Import remains fully available and tags can be entered manually.</p>}
        <p className="muted" aria-live="polite">{props.modelMessage}</p>
      </section>
    </section>
  </div>;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
