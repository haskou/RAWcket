import { useRef, type ReactElement } from 'react';
import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';

type UnitField = 'opacity' | 'feather' | 'density';

export function MaskControls({
  project,
  selectedId,
  brushActive,
  brushSize,
  onSelect,
  onAddBrush,
  onAddRadial,
  onUpdate,
  onRemove,
  onBrushActiveChange,
  onBrushSizeChange
}: {
  project: PhotoProject;
  selectedId: string | null;
  brushActive: boolean;
  brushSize: number;
  onSelect: (id: string) => void;
  onAddBrush: () => void;
  onAddRadial: () => void;
  onUpdate: (mask: MaskDefinitionPrimitives, groupId: string | null) => void;
  onRemove: (id: string) => void;
  onBrushActiveChange: (active: boolean) => void;
  onBrushSizeChange: (size: number) => void;
}): ReactElement {
  const groups = useRef(new Map<string, string>());
  const masks = project.getMasks().map((mask) => mask.toPrimitives());
  const selected = masks.find((mask) => mask.id === selectedId) ?? null;

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

  return (
    <div className="mask-controls">
      <div className="mask-create-actions">
        <button type="button" onClick={onAddBrush}>+ Brush mask</button>
        <button type="button" onClick={onAddRadial}>+ Radial mask</button>
      </div>
      {masks.length === 0 && <p className="mask-empty">Create a local mask, then paint or position it directly over the photograph.</p>}
      <div className="mask-list">
        {masks.map((mask, index) => (
          <button className={mask.id === selectedId ? 'active' : ''} type="button" key={mask.id} onClick={() => onSelect(mask.id)}>
            <span>{mask.shape.kind === 'brush' ? 'Brush' : mask.shape.kind === 'radial' ? 'Radial' : 'Mask'} {index + 1}</span>
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
