import { useRef, type ReactElement } from 'react';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import { ViewportTransform, type ViewportTransformPrimitives } from '@/contexts/projects/domain/ViewportTransform';
import type { CompositionGuide } from '../editor/CompositionGuide';

type NumericViewportField = 'rotationDegrees' | 'horizontalPerspective' | 'verticalPerspective' | 'scale';
type CropField = keyof ViewportTransformPrimitives['cropFrame'];
type TranslationField = keyof ViewportTransformPrimitives['translation'];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function GeometryControls({ project, onChange, guide, onGuideChange, horizonBusy, horizonMessage, onAutoStraighten }: {
  project: PhotoProject;
  onChange: (viewport: ViewportTransformPrimitives, groupId: string | null) => void;
  guide: CompositionGuide;
  onGuideChange: (guide: CompositionGuide) => void;
  horizonBusy: boolean;
  horizonMessage: string;
  onAutoStraighten: () => void;
}): ReactElement {
  const groups = useRef(new Map<string, string>());
  const viewport = project.getViewportTransform().toPrimitives();
  const defaults = ViewportTransform.reset().toPrimitives();
  const source = project.toPrimitives().metadata;
  const originalRatio = { width: source.width, height: source.height };

  const changeNumeric = (field: NumericViewportField, value: number, groupId: string | null): void => {
    if (!Number.isFinite(value)) return;
    onChange({ ...viewport, [field]: value }, groupId);
  };

  const changeTranslation = (field: TranslationField, value: number, groupId: string | null): void => {
    if (!Number.isFinite(value)) return;
    onChange({ ...viewport, translation: { ...viewport.translation, [field]: clamp(value, 0, 1) } }, groupId);
  };

  const changeCrop = (field: CropField, value: number, groupId: string | null): void => {
    if (!Number.isFinite(value)) return;
    const crop = { ...viewport.cropFrame };
    if (field === 'x') crop.x = clamp(value, 0, 1 - crop.width);
    if (field === 'y') crop.y = clamp(value, 0, 1 - crop.height);
    if (field === 'width') crop.width = clamp(value, 0.05, 1 - crop.x);
    if (field === 'height') crop.height = clamp(value, 0.05, 1 - crop.y);
    onChange({ ...viewport, cropFrame: crop }, groupId);
  };

  const toggle = (field: 'flipHorizontal' | 'flipVertical'): void => {
    onChange({ ...viewport, [field]: !viewport[field] }, null);
  };

  const reset = (): void => onChange(ViewportTransform.reset().toPrimitives(), null);

  return (
    <div className="geometry-controls">
      <details className="context-help" open>
        <summary>Framing and straightening guides</summary>
        <p>Guides stay fixed while the photograph moves underneath them, so the dense grid can check horizons and converging architecture. Rotation levels the frame; vertical and horizontal perspective reshape opposite edges. Guides never appear in export.</p>
      </details>
      <div className="auto-straighten-control">
        <button className="button ghost full" type="button" disabled={horizonBusy} onClick={onAutoStraighten}>{horizonBusy ? 'Analyzing horizon…' : 'Auto straighten · local'}</button>
        <small aria-live="polite">{horizonMessage}</small>
      </div>
      <div className="composition-guide-controls">
        <label>Composition overlay<select aria-label="Geometry composition guide" value={guide} onChange={(event) => onGuideChange(event.target.value as CompositionGuide)}><option value="none">None</option><option value="thirds">Rule of thirds</option><option value="grid">Dense fixed grid</option><option value="diagonals">Diagonals</option><option value="golden-ratio">Golden ratio</option></select></label>
        <label>Crop aspect ratio<select aria-label="Crop aspect ratio" value={aspectRatioValue(viewport.aspectRatio, originalRatio)} onChange={(event) => onChange({ ...viewport, aspectRatio: ratioFromValue(event.target.value, originalRatio) }, null)}><option value="free">Free</option><option value="original">Original · locked</option><option value="1:1">1:1 · Square</option><option value="3:2">3:2</option><option value="4:3">4:3</option><option value="5:4">5:4</option><option value="16:9">16:9</option></select></label>
      </div>
      <GeometryNumberControl label="Rotation" unit="°" value={viewport.rotationDegrees} modified={viewport.rotationDegrees !== defaults.rotationDegrees} minimum={-180} maximum={180} step={0.1} groupKey="rotation" groups={groups.current} onChange={(value, groupId) => changeNumeric('rotationDegrees', value, groupId)} />
      <GeometryNumberControl label="Vertical perspective" unit="%" value={viewport.verticalPerspective} modified={viewport.verticalPerspective !== defaults.verticalPerspective} minimum={-100} maximum={100} step={1} groupKey="vertical-perspective" groups={groups.current} onChange={(value, groupId) => changeNumeric('verticalPerspective', value, groupId)} />
      <GeometryNumberControl label="Horizontal perspective" unit="%" value={viewport.horizontalPerspective} modified={viewport.horizontalPerspective !== defaults.horizontalPerspective} minimum={-100} maximum={100} step={1} groupKey="horizontal-perspective" groups={groups.current} onChange={(value, groupId) => changeNumeric('horizontalPerspective', value, groupId)} />
      <GeometryNumberControl label="Development scale" unit="×" value={viewport.scale} modified={viewport.scale !== defaults.scale} minimum={0.1} maximum={4} step={0.01} groupKey="scale" groups={groups.current} onChange={(value, groupId) => changeNumeric('scale', value, groupId)} />
      <div className="geometry-grid-heading">Image position</div>
      <GeometryNumberControl label="X" value={viewport.translation.x} modified={viewport.translation.x !== defaults.translation.x} minimum={0} maximum={1} step={0.001} groupKey="translation-x" groups={groups.current} onChange={(value, groupId) => changeTranslation('x', value, groupId)} />
      <GeometryNumberControl label="Y" value={viewport.translation.y} modified={viewport.translation.y !== defaults.translation.y} minimum={0} maximum={1} step={0.001} groupKey="translation-y" groups={groups.current} onChange={(value, groupId) => changeTranslation('y', value, groupId)} />
      <div className="geometry-grid-heading">Normalized crop frame</div>
      <GeometryNumberControl label="Left" value={viewport.cropFrame.x} modified={viewport.cropFrame.x !== defaults.cropFrame.x} minimum={0} maximum={1 - viewport.cropFrame.width} step={0.001} groupKey="crop-x" groups={groups.current} onChange={(value, groupId) => changeCrop('x', value, groupId)} />
      <GeometryNumberControl label="Top" value={viewport.cropFrame.y} modified={viewport.cropFrame.y !== defaults.cropFrame.y} minimum={0} maximum={1 - viewport.cropFrame.height} step={0.001} groupKey="crop-y" groups={groups.current} onChange={(value, groupId) => changeCrop('y', value, groupId)} />
      <GeometryNumberControl label="Width" value={viewport.cropFrame.width} modified={viewport.cropFrame.width !== defaults.cropFrame.width} minimum={0.05} maximum={1 - viewport.cropFrame.x} step={0.001} groupKey="crop-width" groups={groups.current} onChange={(value, groupId) => changeCrop('width', value, groupId)} />
      <GeometryNumberControl label="Height" value={viewport.cropFrame.height} modified={viewport.cropFrame.height !== defaults.cropFrame.height} minimum={0.05} maximum={1 - viewport.cropFrame.y} step={0.001} groupKey="crop-height" groups={groups.current} onChange={(value, groupId) => changeCrop('height', value, groupId)} />
      <div className="geometry-actions">
        <button className={viewport.flipHorizontal ? 'active' : ''} type="button" onClick={() => toggle('flipHorizontal')}>Flip horizontal</button>
        <button className={viewport.flipVertical ? 'active' : ''} type="button" onClick={() => toggle('flipVertical')}>Flip vertical</button>
        <button type="button" onClick={reset}>Reset geometry</button>
      </div>
    </div>
  );
}

function aspectRatioValue(current: { width: number; height: number } | null, original: { width: number; height: number }): string {
  if (current === null) return 'free';
  if (Math.abs(current.width / current.height - original.width / original.height) < 0.0001) return 'original';
  return `${current.width}:${current.height}`;
}

function ratioFromValue(value: string, original: { width: number; height: number }): { width: number; height: number } | null {
  if (value === 'free') return null;
  if (value === 'original') return original;
  const [width = 1, height = 1] = value.split(':').map(Number);
  return { width, height };
}

function GeometryNumberControl({ label, unit, value, modified, minimum, maximum, step, groupKey, groups, onChange }: {
  label: string;
  unit?: string;
  value: number;
  modified: boolean;
  minimum: number;
  maximum: number;
  step: number;
  groupKey: string;
  groups: Map<string, string>;
  onChange: (value: number, groupId: string | null) => void;
}): ReactElement {
  return (
    <div className={`geometry-number-control ${modified ? 'modified' : ''}`}>
      <div><label htmlFor={`geometry-${groupKey}`}>{label}{modified && <span className="modified-mark" aria-label="Modified">●</span>}</label><span><input aria-label={`${label} numeric value`} type="number" min={minimum} max={maximum} step={step} value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber, null)} />{unit}</span></div>
      <input
        id={`geometry-${groupKey}`}
        aria-label={label}
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        onPointerDown={() => groups.set(groupKey, crypto.randomUUID())}
        onPointerUp={() => groups.delete(groupKey)}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber, groups.get(groupKey) ?? null)}
      />
    </div>
  );
}
