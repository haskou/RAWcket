import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import type { MaskCompositionOperationPrimitive } from '@/contexts/projects/domain/value-objects/MaskCompositionOperation';
import { maskKindLabel, projectMaskRow } from '../editor/MaskRowProjector';

type UnitField = 'opacity' | 'feather' | 'density';

export function MaskControls({
  project,
  selectedId,
  brushActive,
  colorPointActive,
  aiPointActive,
  aiPointPolarity,
  brushSize,
  brushMode,
  overlayVisible,
  onSelect,
  onAddBrush,
  onAddRadial,
  onAddLinear,
  onAddLuminance,
  onAddColor,
  onUpdate,
  onRemove,
  onCompose,
  onDecompose,
  onBrushActiveChange,
  onColorPointActiveChange,
  onAiPointActiveChange,
  onAiPointPolarityChange,
  onBrushSizeChange,
  onBrushModeChange,
  onOverlayVisibleChange
}: {
  project: PhotoProject;
  selectedId: string | null;
  brushActive: boolean;
  colorPointActive: boolean;
  aiPointActive: boolean;
  aiPointPolarity: 'positive' | 'negative';
  brushSize: number;
  brushMode: 'add' | 'erase';
  overlayVisible: boolean;
  onSelect: (id: string) => void;
  onAddBrush: () => void;
  onAddRadial: () => void;
  onAddLinear: () => void;
  onAddLuminance: () => void;
  onAddColor: () => void;
  onUpdate: (mask: MaskDefinitionPrimitives, groupId: string | null) => void;
  onRemove: (id: string) => void;
  onCompose: (maskIds: string[], operation: MaskCompositionOperationPrimitive) => void;
  onDecompose: (id: string) => void;
  onBrushActiveChange: (active: boolean) => void;
  onColorPointActiveChange: (active: boolean) => void;
  onAiPointActiveChange: (active: boolean) => void;
  onAiPointPolarityChange: (polarity: 'positive' | 'negative') => void;
  onBrushSizeChange: (size: number) => void;
  onBrushModeChange: (mode: 'add' | 'erase') => void;
  onOverlayVisibleChange: (visible: boolean) => void;
}): ReactElement {
  const groups = useRef(new Map<string, string>());
  const [compositionMaskIds, setCompositionMaskIds] = useState<string[]>([]);
  const [compositionOperation, setCompositionOperation] = useState<MaskCompositionOperationPrimitive>('add');
  const masks = project.getMasks().map((mask) => mask.toPrimitives());
  const maskIdsKey = masks.map((mask) => mask.id).join(':');
  const selected = masks.find((mask) => mask.id === selectedId) ?? null;
  const selectedColorSamples = selected?.shape.kind === 'color-range' ? selected.shape.samples : [];

  useEffect(() => {
    const available = new Set(maskIdsKey.length === 0 ? [] : maskIdsKey.split(':'));
    setCompositionMaskIds((current) => current.filter((id) => available.has(id)));
  }, [maskIdsKey]);

  const toggleCompositionMask = (id: string): void => {
    setCompositionMaskIds((current) => current.includes(id)
      ? current.filter((candidate) => candidate !== id)
      : [...current, id]);
  };

  const composeSelectedMasks = (): void => {
    if (compositionMaskIds.length < 2) return;
    onCompose([...compositionMaskIds], compositionOperation);
    setCompositionMaskIds([]);
  };

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

  const updateExpansion = (value: number, groupId: string | null): void => {
    if (selected === null || !Number.isFinite(value)) return;
    onUpdate({ ...selected, expansion: Math.min(0.25, Math.max(-0.25, value)) }, groupId);
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

  const updateColorTolerance = (value: number, groupId: string | null): void => {
    if (selected?.shape.kind !== 'color-range' || !Number.isFinite(value)) return;
    onUpdate({ ...selected, shape: { ...selected.shape, tolerance: Math.min(1, Math.max(0, value)) } }, groupId);
  };

  const updateColorSample = (index: number, axis: 'x' | 'y', value: number, groupId: string | null): void => {
    if (selected?.shape.kind !== 'color-range' || !Number.isFinite(value)) return;
    const current = selected.shape.samples[index];
    if (current === undefined) return;
    const samples = [...selected.shape.samples];
    samples[index] = { ...current, [axis]: Math.min(1, Math.max(0, value)) };
    onUpdate({ ...selected, shape: { ...selected.shape, samples } }, groupId);
  };

  const removeColorSample = (index: number): void => {
    if (selected?.shape.kind !== 'color-range' || selected.shape.samples.length <= 1) return;
    onUpdate({ ...selected, shape: { ...selected.shape, samples: selected.shape.samples.filter((_, sampleIndex) => sampleIndex !== index) } }, null);
  };

  const addAiBoundingBox = (): void => {
    if (selected?.shape.kind !== 'ai-segmentation') return;
    const offset = Math.min(0.35, 0.05 * selected.shape.boundingBoxes.length);
    onUpdate({
      ...selected,
      shape: {
        ...selected.shape,
        boundingBoxes: [...selected.shape.boundingBoxes, { x: 0.2 + offset, y: 0.2 + offset, width: 0.5, height: 0.5 }]
      }
    }, null);
  };

  const removeAiBoundingBox = (index: number): void => {
    if (selected?.shape.kind !== 'ai-segmentation') return;
    onUpdate({ ...selected, shape: { ...selected.shape, boundingBoxes: selected.shape.boundingBoxes.filter((_, boxIndex) => boxIndex !== index) } }, null);
  };

  const updateAiBoundingBox = (index: number, field: 'x' | 'y' | 'width' | 'height', value: number, groupId: string | null): void => {
    if (selected?.shape.kind !== 'ai-segmentation' || !Number.isFinite(value)) return;
    const current = selected.shape.boundingBoxes[index];
    if (current === undefined) return;
    const bounded = Math.min(1, Math.max(0, value));
    const candidate = { ...current, [field]: bounded };
    candidate.width = Math.min(candidate.width, 1 - candidate.x);
    candidate.height = Math.min(candidate.height, 1 - candidate.y);
    const boundingBoxes = [...selected.shape.boundingBoxes];
    boundingBoxes[index] = candidate;
    onUpdate({ ...selected, shape: { ...selected.shape, boundingBoxes } }, groupId);
  };

  const updateAiPoint = (
    polarity: 'positive' | 'negative',
    index: number,
    axis: 'x' | 'y',
    value: number,
    groupId: string | null
  ): void => {
    if (selected?.shape.kind !== 'ai-segmentation' || !Number.isFinite(value)) return;
    const key = polarity === 'positive' ? 'positivePoints' : 'negativePoints';
    const current = selected.shape[key][index];
    if (current === undefined) return;
    const points = [...selected.shape[key]];
    points[index] = { ...current, [axis]: Math.min(1, Math.max(0, value)) };
    onUpdate({ ...selected, shape: { ...selected.shape, [key]: points } }, groupId);
  };

  const removeAiPoint = (polarity: 'positive' | 'negative', index: number): void => {
    if (selected?.shape.kind !== 'ai-segmentation') return;
    const key = polarity === 'positive' ? 'positivePoints' : 'negativePoints';
    onUpdate({ ...selected, shape: { ...selected.shape, [key]: selected.shape[key].filter((_, pointIndex) => pointIndex !== index) } }, null);
  };

  const clearAiPoints = (): void => {
    if (selected?.shape.kind !== 'ai-segmentation') return;
    onUpdate({ ...selected, shape: { ...selected.shape, positivePoints: [], negativePoints: [] } }, null);
  };

  const updateCompositeOperation = (operation: MaskCompositionOperationPrimitive): void => {
    if (selected?.shape.kind !== 'composite') return;
    onUpdate({ ...selected, shape: { ...selected.shape, operation } }, null);
  };

  return (
    <div className="mask-controls">
      <details className="context-help mask-help" open={masks.length === 0}>
        <summary>How local masks work</summary>
        <ol><li>Create a mask shape.</li><li>Select it below and position or paint it over the photograph.</li><li>Change <strong>Local exposure</strong>; only covered pixels are affected.</li><li>Use Feather for softer edges, Density for strength, and Invert for the opposite region.</li></ol>
        <p>The colored overlay is an editing aid and is never exported. Every mask remains reversible recipe data.</p>
      </details>
      <label className="mask-overlay-switch"><input type="checkbox" checked={overlayVisible} onChange={(event) => onOverlayVisibleChange(event.target.checked)} /> Show colored mask overlay</label>
      <div className="mask-create-actions">
        <button type="button" aria-label="+ Brush mask" title="Paint freehand directly over the photograph" onClick={onAddBrush}><strong>+ Brush</strong><small>Paint a free shape</small></button>
        <button type="button" aria-label="+ Radial mask" title="An editable ellipse for faces, objects, and vignettes" onClick={onAddRadial}><strong>+ Radial</strong><small>Ellipse or spotlight</small></button>
        <button type="button" aria-label="+ Linear gradient" title="A gradual transition between two editable points" onClick={onAddLinear}><strong>+ Linear</strong><small>Graduated transition</small></button>
        <button type="button" aria-label="+ Luminance range" title="Select pixels by rendered brightness, regardless of position" onClick={onAddLuminance}><strong>+ Luminance</strong><small>Select by brightness</small></button>
        <button type="button" aria-label="+ Color range" title="Sample colors from the unchanged photograph, regardless of position" onClick={onAddColor}><strong>+ Color</strong><small>Match sampled colors</small></button>
      </div>
      {masks.length === 0 && <p className="mask-empty">Create a local mask, then paint or position it directly over the photograph.</p>}
      <div className="mask-list">
        {masks.map((mask, index) => {
          const row = projectMaskRow(mask, index);
          return <button className={mask.id === selectedId ? 'active' : ''} type="button" key={mask.id} onClick={() => onSelect(mask.id)}>
            <span className="mask-row-identity"><strong>{row.title}</strong>{row.provenance !== null && <small>{row.provenance}</small>}</span>
            <small className="mask-row-status">{row.status}</small>
          </button>;
        })}
      </div>
      {masks.length >= 2 && <fieldset className="mask-composition-builder">
        <legend>Combine masks</legend>
        <p>Choose masks in order. The first selection is the primary mask: its local adjustments move to the composite. Every child shape and modifier remains intact and can be released later.</p>
        <div className="mask-composition-choices" role="group" aria-label="Masks to combine">
          {masks.map((mask, index) => {
            const selectionIndex = compositionMaskIds.indexOf(mask.id);
            return <label key={mask.id}>
              <input type="checkbox" aria-label={`Use ${maskKindLabel(mask.shape.kind)} ${index + 1} in composition`} checked={selectionIndex >= 0} onChange={() => toggleCompositionMask(mask.id)} />
              <span><strong>{maskKindLabel(mask.shape.kind)} {index + 1}</strong><small>{selectionIndex < 0 ? 'Not selected' : selectionIndex === 0 ? '1 · Primary adjustment' : `${selectionIndex + 1} · Boolean child`}</small></span>
            </label>;
          })}
        </div>
        <label className="mask-composition-operation">Boolean operation
          <select aria-label="Mask composition operation" value={compositionOperation} onChange={(event) => setCompositionOperation(maskCompositionOperationFromInput(event.target.value))}>
            <option value="add">Add · union</option>
            <option value="subtract">Subtract · primary minus the rest</option>
            <option value="intersect">Intersect · overlap only</option>
          </select>
        </label>
        <div className="mask-composition-actions">
          <button className="button ghost" type="button" disabled={compositionMaskIds.length === 0} onClick={() => setCompositionMaskIds([])}>Clear selection</button>
          <button className="button ai-primary" type="button" disabled={compositionMaskIds.length < 2} onClick={composeSelectedMasks}>Combine {compositionMaskIds.length < 2 ? 'masks' : `${compositionMaskIds.length} masks`}</button>
        </div>
      </fieldset>}
      {selected !== null && (
        <div className="selected-mask-controls">
          <div className="selected-mask-status"><span className="mask-status-swatch" aria-hidden="true" /><span><strong>{maskKindLabel(selected.shape.kind)} mask selected</strong><small>{maskKindExplanation(selected.shape.kind)}</small></span></div>
          <div className="mask-switches">
            <label><input type="checkbox" checked={selected.enabled} onChange={(event) => onUpdate({ ...selected, enabled: event.target.checked }, null)} /> Enabled</label>
            <label><input type="checkbox" checked={selected.inverted} onChange={(event) => onUpdate({ ...selected, inverted: event.target.checked }, null)} /> Invert</label>
          </div>
          {selected.shape.kind === 'brush' && (
            <>
              <div className="ai-point-polarity" aria-label="Brush stroke mode">
                <button className={brushMode === 'add' ? 'active' : ''} type="button" aria-pressed={brushMode === 'add'} onClick={() => onBrushModeChange('add')}>Paint</button>
                <button className={brushMode === 'erase' ? 'active' : ''} type="button" aria-pressed={brushMode === 'erase'} onClick={() => onBrushModeChange('erase')}>Erase</button>
              </div>
              <button className={`button ${brushActive ? 'ai-primary' : 'ghost'} full`} type="button" onClick={() => onBrushActiveChange(!brushActive)}>{brushActive ? 'Painting · press Escape to stop' : 'Paint on photograph'}</button>
              <MaskNumberControl label="Brush size" value={brushSize} minimum={0.005} maximum={0.5} step={0.005} groupKey="brush-size" groups={groups.current} onChange={(value) => onBrushSizeChange(value)} />
              <p className="mask-inline-help">A pen uses its pressure for diameter and flow. Mouse strokes remain at full pressure. Erasing subtracts editable stroke coverage and never changes the original.</p>
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
              <p className="mask-inline-help"><strong>Visualization limitation:</strong> luminance coverage is rendered into the photograph, but a per-pixel green overlay is not available yet. Adjust Local exposure temporarily to confirm the selected range.</p>
              <MaskNumberControl label="Minimum" value={selected.shape.minimum} minimum={0} maximum={1} step={0.01} groupKey="luminance-minimum" groups={groups.current} onChange={(value, groupId) => updateLuminance('minimum', value, groupId)} />
              <MaskNumberControl label="Maximum" value={selected.shape.maximum} minimum={0} maximum={1} step={0.01} groupKey="luminance-maximum" groups={groups.current} onChange={(value, groupId) => updateLuminance('maximum', value, groupId)} />
            </>
          )}
          {selected.shape.kind === 'color-range' && (
            <>
              <div className="geometry-grid-heading">Source color samples</div>
              <p className="mask-inline-help">Samples are read from the unchanged source, so later exposure or color edits cannot move the selection. Matching colors are selected anywhere in the photograph.</p>
              <button className={`button ${colorPointActive ? 'ai-primary' : 'ghost'} full`} type="button" onClick={() => onColorPointActiveChange(!colorPointActive)}>{colorPointActive ? 'Sampling colors · press Escape to stop' : 'Add sample on photograph'}</button>
              <MaskNumberControl label="Color tolerance" value={selected.shape.tolerance} minimum={0} maximum={1} step={0.005} groupKey="color-tolerance" groups={groups.current} onChange={updateColorTolerance} />
              {selectedColorSamples.map((sample, index) => <fieldset className="mask-sample-fields" key={index}>
                <legend>Sample {index + 1}</legend>
                <MaskNumberControl label={`Sample ${index + 1} X`} value={sample.x} minimum={0} maximum={1} step={0.001} groupKey={`color-sample-${index}-x`} groups={groups.current} onChange={(value, groupId) => updateColorSample(index, 'x', value, groupId)} />
                <MaskNumberControl label={`Sample ${index + 1} Y`} value={sample.y} minimum={0} maximum={1} step={0.001} groupKey={`color-sample-${index}-y`} groups={groups.current} onChange={(value, groupId) => updateColorSample(index, 'y', value, groupId)} />
                <button className="button ghost full" type="button" disabled={selectedColorSamples.length <= 1} onClick={() => removeColorSample(index)}>Remove sample</button>
              </fieldset>)}
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
              {selected.shape.positivePoints.map((point, index) => <AiPointFields key={`positive-${index}`} label="Include" point={point} index={index} groups={groups.current} onChange={(axis, value, groupId) => updateAiPoint('positive', index, axis, value, groupId)} onRemove={() => removeAiPoint('positive', index)} />)}
              {selected.shape.negativePoints.map((point, index) => <AiPointFields key={`negative-${index}`} label="Exclude" point={point} index={index} groups={groups.current} onChange={(axis, value, groupId) => updateAiPoint('negative', index, axis, value, groupId)} onRemove={() => removeAiPoint('negative', index)} />)}
              {selected.shape.boundingBoxes.map((box, index) => <fieldset className="mask-sample-fields" key={index}>
                <legend>Constraint box {index + 1}</legend>
                {(['x', 'y', 'width', 'height'] as const).map((field) => <MaskNumberControl key={field} label={`Box ${index + 1} ${boxFieldLabel(field)}`} value={box[field]} minimum={0} maximum={1} step={0.001} groupKey={`ai-box-${index}-${field}`} groups={groups.current} onChange={(value, groupId) => updateAiBoundingBox(index, field, value, groupId)} />)}
                <button className="button ghost full" type="button" onClick={() => removeAiBoundingBox(index)}>Remove constraint box {index + 1}</button>
              </fieldset>)}
              <button className="button ghost full" type="button" onClick={addAiBoundingBox}>{selected.shape.boundingBoxes.length === 0 ? 'Add editable constraint box' : 'Add another constraint box'}</button>
            </>
          )}
          {selected.shape.kind === 'composite' && (
            <div className="selected-composite-mask">
              <label>Boolean operation
                <select aria-label="Selected composite operation" value={selected.shape.operation} onChange={(event) => updateCompositeOperation(maskCompositionOperationFromInput(event.target.value))}>
                  <option value="add">Add · union</option>
                  <option value="subtract">Subtract · primary minus the rest</option>
                  <option value="intersect">Intersect · overlap only</option>
                </select>
              </label>
              <ol aria-label="Composite mask children">{selected.shape.children.map((child, index) => <li key={child.id}><span><strong>{maskKindLabel(child.shape.kind)} child</strong><small>{index === 0 ? 'Primary area' : `${index + 1} · ${child.enabled ? 'Enabled' : 'Disabled'}`}</small></span></li>)}</ol>
              <p>Child masks keep their exact vectors, opacity, feather, density, expansion, inversion, and prior local values. The composite local controls below define the visible edit.</p>
              <button className="button ghost full" type="button" onClick={() => onDecompose(selected.id)}>Release child masks</button>
            </div>
          )}
          <MaskNumberControl label="Local exposure" value={selected.localAdjustments.exposure ?? 0} minimum={-5} maximum={5} step={0.05} groupKey="mask-exposure" groups={groups.current} onChange={updateExposure} />
          <MaskNumberControl label="Opacity" value={selected.opacity} minimum={0} maximum={1} step={0.01} groupKey="mask-opacity" groups={groups.current} onChange={(value, groupId) => updateUnit('opacity', value, groupId)} />
          <MaskNumberControl label="Feather" value={selected.feather} minimum={0} maximum={1} step={0.01} groupKey="mask-feather" groups={groups.current} onChange={(value, groupId) => updateUnit('feather', value, groupId)} />
          <MaskNumberControl label="Density" value={selected.density} minimum={0} maximum={1} step={0.01} groupKey="mask-density" groups={groups.current} onChange={(value, groupId) => updateUnit('density', value, groupId)} />
          <MaskNumberControl label="Expand / contract" value={selected.expansion ?? 0} minimum={-0.25} maximum={0.25} step={0.005} groupKey="mask-expansion" groups={groups.current} onChange={updateExpansion} />
          <button className="button ghost danger full" type="button" onClick={() => onRemove(selected.id)}>Delete mask</button>
        </div>
      )}
    </div>
  );
}

function maskCompositionOperationFromInput(value: string): MaskCompositionOperationPrimitive {
  if (value === 'add' || value === 'subtract' || value === 'intersect') return value;
  throw new Error(`Unsupported mask composition operation: ${value}`);
}

function boxFieldLabel(field: 'x' | 'y' | 'width' | 'height'): string {
  if (field === 'x') return 'X';
  if (field === 'y') return 'Y';
  return field === 'width' ? 'Width' : 'Height';
}

function maskKindExplanation(kind: MaskDefinitionPrimitives['shape']['kind']): string {
  if (kind === 'brush') return 'Activate painting, then drag directly on the photograph.';
  if (kind === 'radial') return 'The ellipse defines the affected region; edit its center, radii, and rotation.';
  if (kind === 'linear-gradient') return 'The effect increases gradually from the start point to the end point.';
  if (kind === 'luminance-range') return 'Pixels are selected by rendered brightness, not by a fixed shape.';
  if (kind === 'ai-segmentation') return 'Positive points include a region; negative points reject similar areas.';
  if (kind === 'color-range') return 'Pixels are selected around sampled colors.';
  return 'Child masks are combined non-destructively.';
}

function AiPointFields({ label, point, index, groups, onChange, onRemove }: {
  label: 'Include' | 'Exclude';
  point: { x: number; y: number };
  index: number;
  groups: Map<string, string>;
  onChange: (axis: 'x' | 'y', value: number, groupId: string | null) => void;
  onRemove: () => void;
}): ReactElement {
  const number = index + 1;
  return <fieldset className="mask-sample-fields">
    <legend>{label} point {number}</legend>
    <MaskNumberControl label={`${label} point ${number} X`} value={point.x} minimum={0} maximum={1} step={0.001} groupKey={`ai-${label.toLowerCase()}-${index}-x`} groups={groups} onChange={(value, groupId) => onChange('x', value, groupId)} />
    <MaskNumberControl label={`${label} point ${number} Y`} value={point.y} minimum={0} maximum={1} step={0.001} groupKey={`ai-${label.toLowerCase()}-${index}-y`} groups={groups} onChange={(value, groupId) => onChange('y', value, groupId)} />
    <button className="button ghost full" type="button" onClick={onRemove}>Remove {label.toLowerCase()} point {number}</button>
  </fieldset>;
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
