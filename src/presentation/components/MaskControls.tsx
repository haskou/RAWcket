import { useRef, type ReactElement } from 'react';
import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';

type UnitField = 'opacity' | 'feather' | 'density';

export function MaskControls({
  project,
  selectedId,
  brushActive,
  aiPointActive,
  aiPointPolarity,
  brushSize,
  onSelect,
  onAddBrush,
  onAddRadial,
  onAddLinear,
  onAddLuminance,
  onAddAi,
  onUpdate,
  onRemove,
  onBrushActiveChange,
  onAiPointActiveChange,
  onAiPointPolarityChange,
  onBrushSizeChange
}: {
  project: PhotoProject;
  selectedId: string | null;
  brushActive: boolean;
  aiPointActive: boolean;
  aiPointPolarity: 'positive' | 'negative';
  brushSize: number;
  onSelect: (id: string) => void;
  onAddBrush: () => void;
  onAddRadial: () => void;
  onAddLinear: () => void;
  onAddLuminance: () => void;
  onAddAi: () => void;
  onUpdate: (mask: MaskDefinitionPrimitives, groupId: string | null) => void;
  onRemove: (id: string) => void;
  onBrushActiveChange: (active: boolean) => void;
  onAiPointActiveChange: (active: boolean) => void;
  onAiPointPolarityChange: (polarity: 'positive' | 'negative') => void;
  onBrushSizeChange: (size: number) => void;
}): ReactElement {
  const groups = useRef(new Map<string, string>());
  const masks = project.getMasks().map((mask) => mask.toPrimitives());
  const selected = masks.find((mask) => mask.id === selectedId) ?? null;
  const selectedAiBoundingBox = selected?.shape.kind === 'ai-segmentation' ? selected.shape.boundingBoxes[0] : undefined;

  const updateUnit = (field: UnitField, value: number, groupId: string | null): void => {
    if (selected === null || !Number.isFinite(value)) return;
    onUpdate({ ...selected, [field]: Math.min(1, Math.max(0, value)) }, groupId);
  };

  const updateExposure = (value: number, groupId: string | null): void => {
    if (selected === null || !Number.isFinite(value)) return;
    onUpdate({
      ...selected,
      localAdjustments: { ...selected.localAdjustments, exposure: Math.min(5, Math.max(-5, value)) }
    }, groupId);
  };

  const updateRadial = (
    field: 'centerX' | 'centerY' | 'radiusX' | 'radiusY' | 'rotationDegrees',
    value: number,
    groupId: string | null
  ): void => {
    if (selected?.shape.kind !== 'radial' || !Number.isFinite(value)) return;
    const shape = selected.shape;
    if (field === 'centerX') onUpdate({ ...selected, shape: { ...shape, center: { ...shape.center, x: Math.min(1, Math.max(0, value)) } } }, groupId);
    if (field === 'centerY') onUpdate({ ...selected, shape: { ...shape, center: { ...shape.center, y: Math.min(1, Math.max(0, value)) } } }, groupId);
    if (field === 'radiusX') onUpdate({ ...selected, shape: { ...shape, radiusX: Math.min(1, Math.max(0.01, value)) } }, groupId);
    if (field === 'radiusY') onUpdate({ ...selected, shape: { ...shape, radiusY: Math.min(1, Math.max(0.01, value)) } }, groupId);
    if (field === 'rotationDegrees') onUpdate({ ...selected, shape: { ...shape, rotationDegrees: Math.min(180, Math.max(-180, value)) } }, groupId);
  };

  const updateLinear = (point: 'start' | 'end', axis: 'x' | 'y', value: number, groupId: string | null): void => {
    if (selected?.shape.kind !== 'linear-gradient' || !Number.isFinite(value)) return;
    const bounded = Math.min(1, Math.max(0, value));
    onUpdate({
      ...selected,
      shape: { ...selected.shape, [point]: { ...selected.shape[point], [axis]: bounded } }
    }, groupId);
  };

  const updateLuminance = (edge: 'minimum' | 'maximum', value: number, groupId: string | null): void => {
    if (selected?.shape.kind !== 'luminance-range' || !Number.isFinite(value)) return;
    const bounded = Math.min(1, Math.max(0, value));
    const shape = edge === 'minimum'
      ? { ...selected.shape, minimum: Math.min(bounded, selected.shape.maximum) }
      : { ...selected.shape, maximum: Math.max(bounded, selected.shape.minimum) };
    onUpdate({ ...selected, shape }, groupId);
  };

  const addAiBoundingBox = (): void => {
    if (selected?.shape.kind !== 'ai-segmentation') return;
    onUpdate({ ...selected, shape: { ...selected.shape, boundingBoxes: [{ x: 0.2, y: 0.2, width: 0.6, height: 0.6 }] } }, null);
  };

  const removeAiBoundingBox = (): void => {
    if (selected?.shape.kind !== 'ai-segmentation') return;
    onUpdate({ ...selected, shape: { ...selected.shape, boundingBoxes: [] } }, null);
  };

  const updateAiBoundingBox = (field: 'x' | 'y' | 'width' | 'height', value: number, groupId: string | null): void => {
    if (selected?.shape.kind !== 'ai-segmentation' || !Number.isFinite(value)) return;
    const current = selected.shape.boundingBoxes[0];
    if (current === undefined) return;
    const bounded = Math.min(1, Math.max(0, value));
    const candidate = { ...current, [field]: bounded };
    candidate.width = Math.min(candidate.width, 1 - candidate.x);
    candidate.height = Math.min(candidate.height, 1 - candidate.y);
    onUpdate({ ...selected, shape: { ...selected.shape, boundingBoxes: [candidate] } }, groupId);
  };

  const clearAiPoints = (): void => {
    if (selected?.shape.kind !== 'ai-segmentation') return;
    onUpdate({ ...selected, shape: { ...selected.shape, positivePoints: [], negativePoints: [] } }, null);
  };

  return (
    <div className="mask-controls">
      <div className="mask-create-actions">
        <button type="button" onClick={onAddBrush}>+ Brush mask</button>
        <button type="button" onClick={onAddRadial}>+ Radial mask</button>
        <button type="button" onClick={onAddLinear}>+ Linear gradient</button>
        <button type="button" onClick={onAddLuminance}>+ Luminance range</button>
        <button type="button" onClick={onAddAi}>✦ Local Smart Mask</button>
      </div>
      {masks.length === 0 && <p className="mask-empty">Create a local mask, then paint or position it directly over the photograph.</p>}
      <div className="mask-list">
        {masks.map((mask, index) => (
          <button className={mask.id === selectedId ? 'active' : ''} type="button" key={mask.id} onClick={() => onSelect(mask.id)}>
            <span>{mask.shape.kind === 'brush' ? 'Brush' : mask.shape.kind === 'radial' ? 'Radial' : mask.shape.kind === 'linear-gradient' ? 'Linear' : mask.shape.kind === 'luminance-range' ? 'Luminance' : mask.shape.kind === 'ai-segmentation' ? 'Smart' : 'Mask'} {index + 1}</span>
            <small>{mask.enabled ? 'On' : 'Off'}</small>
          </button>
        ))}
      </div>
      {selected !== null && (
        <div className="selected-mask-controls">
          <div className="mask-switches">
            <label><input type="checkbox" checked={selected.enabled} onChange={(event) => onUpdate({ ...selected, enabled: event.target.checked }, null)} /> Enabled</label>
            <label><input type="checkbox" checked={selected.inverted} onChange={(event) => onUpdate({ ...selected, inverted: event.target.checked }, null)} /> Invert</label>
          </div>
          {selected.shape.kind === 'brush' && (
            <>
              <button className={`button ${brushActive ? 'ai-primary' : 'ghost'} full`} type="button" onClick={() => onBrushActiveChange(!brushActive)}>{brushActive ? 'Painting · press Escape to stop' : 'Paint on photograph'}</button>
              <MaskNumberControl label="Brush size" value={brushSize} minimum={0.005} maximum={0.5} step={0.005} groupKey="brush-size" groups={groups.current} onChange={(value) => onBrushSizeChange(value)} />
            </>
          )}
          {selected.shape.kind === 'radial' && (
            <>
              <div className="geometry-grid-heading">Radial geometry</div>
              <MaskNumberControl label="Center X" value={selected.shape.center.x} minimum={0} maximum={1} step={0.001} groupKey="radial-center-x" groups={groups.current} onChange={(value, groupId) => updateRadial('centerX', value, groupId)} />
              <MaskNumberControl label="Center Y" value={selected.shape.center.y} minimum={0} maximum={1} step={0.001} groupKey="radial-center-y" groups={groups.current} onChange={(value, groupId) => updateRadial('centerY', value, groupId)} />
              <MaskNumberControl label="Radius X" value={selected.shape.radiusX} minimum={0.01} maximum={1} step={0.001} groupKey="radial-radius-x" groups={groups.current} onChange={(value, groupId) => updateRadial('radiusX', value, groupId)} />
              <MaskNumberControl label="Radius Y" value={selected.shape.radiusY} minimum={0.01} maximum={1} step={0.001} groupKey="radial-radius-y" groups={groups.current} onChange={(value, groupId) => updateRadial('radiusY', value, groupId)} />
              <MaskNumberControl label="Mask rotation" value={selected.shape.rotationDegrees} minimum={-180} maximum={180} step={0.1} groupKey="radial-rotation" groups={groups.current} onChange={(value, groupId) => updateRadial('rotationDegrees', value, groupId)} />
            </>
          )}
          {selected.shape.kind === 'linear-gradient' && (
            <>
              <div className="geometry-grid-heading">Linear gradient</div>
              <MaskNumberControl label="Start X" value={selected.shape.start.x} minimum={0} maximum={1} step={0.001} groupKey="linear-start-x" groups={groups.current} onChange={(value, groupId) => updateLinear('start', 'x', value, groupId)} />
              <MaskNumberControl label="Start Y" value={selected.shape.start.y} minimum={0} maximum={1} step={0.001} groupKey="linear-start-y" groups={groups.current} onChange={(value, groupId) => updateLinear('start', 'y', value, groupId)} />
              <MaskNumberControl label="End X" value={selected.shape.end.x} minimum={0} maximum={1} step={0.001} groupKey="linear-end-x" groups={groups.current} onChange={(value, groupId) => updateLinear('end', 'x', value, groupId)} />
              <MaskNumberControl label="End Y" value={selected.shape.end.y} minimum={0} maximum={1} step={0.001} groupKey="linear-end-y" groups={groups.current} onChange={(value, groupId) => updateLinear('end', 'y', value, groupId)} />
            </>
          )}
          {selected.shape.kind === 'luminance-range' && (
            <>
              <div className="geometry-grid-heading">Rendered luminance range</div>
              <MaskNumberControl label="Minimum" value={selected.shape.minimum} minimum={0} maximum={1} step={0.01} groupKey="luminance-minimum" groups={groups.current} onChange={(value, groupId) => updateLuminance('minimum', value, groupId)} />
              <MaskNumberControl label="Maximum" value={selected.shape.maximum} minimum={0} maximum={1} step={0.01} groupKey="luminance-maximum" groups={groups.current} onChange={(value, groupId) => updateLuminance('maximum', value, groupId)} />
            </>
          )}
          {selected.shape.kind === 'ai-segmentation' && (
            <>
              <p className="local-ai-note"><strong>Local Smart Mask</strong> expands positive clicks by spatial and luminance similarity. It is deterministic, offline, and never uploads pixels.</p>
              <div className="ai-point-polarity" aria-label="Smart mask point type">
                <button className={aiPointPolarity === 'positive' ? 'active' : ''} type="button" onClick={() => onAiPointPolarityChange('positive')}>+ Include</button>
                <button className={aiPointPolarity === 'negative' ? 'active' : ''} type="button" onClick={() => onAiPointPolarityChange('negative')}>− Exclude</button>
              </div>
              <button className={`button ${aiPointActive ? 'ai-primary' : 'ghost'} full`} type="button" onClick={() => onAiPointActiveChange(!aiPointActive)}>{aiPointActive ? `Adding ${aiPointPolarity} points · press Escape to stop` : `Add ${aiPointPolarity} points on photograph`}</button>
              <button className="button ghost full" type="button" disabled={selected.shape.positivePoints.length + selected.shape.negativePoints.length === 0} onClick={clearAiPoints}>Clear smart points</button>
              {selected.shape.boundingBoxes.length === 0 ? (
                <button className="button ghost full" type="button" onClick={addAiBoundingBox}>Add editable constraint box</button>
              ) : (
                <>
                  <div className="geometry-grid-heading">Constraint box</div>
                  {(['x', 'y', 'width', 'height'] as const).map((field) => <MaskNumberControl key={field} label={boxFieldLabel(field)} value={selectedAiBoundingBox?.[field] ?? 0} minimum={0} maximum={1} step={0.001} groupKey={`ai-box-${field}`} groups={groups.current} onChange={(value, groupId) => updateAiBoundingBox(field, value, groupId)} />)}
                  <button className="button ghost full" type="button" onClick={removeAiBoundingBox}>Remove constraint box</button>
                </>
              )}
            </>
          )}
          <MaskNumberControl label="Local exposure" value={selected.localAdjustments.exposure ?? 0} minimum={-5} maximum={5} step={0.05} groupKey="mask-exposure" groups={groups.current} onChange={updateExposure} />
          <MaskNumberControl label="Opacity" value={selected.opacity} minimum={0} maximum={1} step={0.01} groupKey="mask-opacity" groups={groups.current} onChange={(value, groupId) => updateUnit('opacity', value, groupId)} />
          <MaskNumberControl label="Feather" value={selected.feather} minimum={0} maximum={1} step={0.01} groupKey="mask-feather" groups={groups.current} onChange={(value, groupId) => updateUnit('feather', value, groupId)} />
          <MaskNumberControl label="Density" value={selected.density} minimum={0} maximum={1} step={0.01} groupKey="mask-density" groups={groups.current} onChange={(value, groupId) => updateUnit('density', value, groupId)} />
          <button className="button ghost danger full" type="button" onClick={() => onRemove(selected.id)}>Delete mask</button>
        </div>
      )}
    </div>
  );
}

function boxFieldLabel(field: 'x' | 'y' | 'width' | 'height'): string {
  if (field === 'x') return 'X';
  if (field === 'y') return 'Y';
  return field === 'width' ? 'Width' : 'Height';
}

function MaskNumberControl({ label, value, minimum, maximum, step, groupKey, groups, onChange }: {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  groupKey: string;
  groups: Map<string, string>;
  onChange: (value: number, groupId: string | null) => void;
}): ReactElement {
  return (
    <div className="mask-number-control">
      <div><label htmlFor={groupKey}>{label}</label><input aria-label={`${label} numeric value`} type="number" min={minimum} max={maximum} step={step} value={value} onChange={(event) => onChange(event.currentTarget.valueAsNumber, null)} /></div>
      <input id={groupKey} type="range" min={minimum} max={maximum} step={step} value={value} onPointerDown={() => groups.set(groupKey, crypto.randomUUID())} onPointerUp={() => groups.delete(groupKey)} onChange={(event) => onChange(event.currentTarget.valueAsNumber, groups.get(groupKey) ?? null)} />
    </div>
  );
}
