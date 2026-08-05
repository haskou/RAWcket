import { useRef, type ReactElement } from 'react';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import { ViewportTransform, type ViewportTransformPrimitives } from '@/contexts/projects/domain/ViewportTransform';
import type { CompositionGuide } from '../editor/CompositionGuide';

type NumericViewportField = 'rotationDegrees' | 'scale';
type CropField = keyof ViewportTransformPrimitives['cropFrame'];
type TranslationField = keyof ViewportTransformPrimitives['translation'];

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function GeometryControls({ project, onChange, guide, showLevelAxes, onGuideChange, onLevelAxesChange }: {
  project: PhotoProject;
  onChange: (viewport: ViewportTransformPrimitives, groupId: string | null) => void;
  guide: CompositionGuide;
  showLevelAxes: boolean;
  onGuideChange: (guide: CompositionGuide) => void;
  onLevelAxesChange: (visible: boolean) => void;
}): ReactElement {
  const groups = useRef(new Map<string, string>());
  const viewport = project.getViewportTransform().toPrimitives();
  const defaults = ViewportTransform.reset().toPrimitives();

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
        <p>Guides are visual references only: they never alter the photograph or export. Use <strong>Level axes</strong> with Rotation to check horizons and vertical architecture.</p>
      </details>
      <div className="composition-guide-controls">
        <label>Composition overlay<select aria-label="Geometry composition guide" value={guide} onChange={(event) => onGuideChange(event.target.value as CompositionGuide)}><option value="none">None</option><option value="thirds">Rule of thirds</option><option value="grid">Quarter grid</option><option value="diagonals">Diagonals</option><option value="golden-ratio">Golden ratio</option></select></label>
        <label><input type="checkbox" checked={showLevelAxes} onChange={(event) => onLevelAxesChange(event.target.checked)} /> Level axes</label>
      </div>
      <GeometryNumberControl label="Rotation" unit="°" value={viewport.rotationDegrees} modified={viewport.rotationDegrees !== defaults.rotationDegrees} minimum={-180} maximum={180} step={0.1} groupKey="rotation" groups={groups.current} onChange={(value, groupId) => changeNumeric('rotationDegrees', value, groupId)} />
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
