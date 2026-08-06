import { useState, type FormEvent, type ReactElement } from 'react';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import type { RecipePreset } from '@/contexts/projects/domain/RecipePreset';
import { AdjustmentKey, type AdjustmentKeyPrimitive } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import { adjustmentDefinitions, type AdjustmentSection } from '../editor/adjustmentDefinitions';

type RecipeBlock = readonly ['curves' | 'crop' | 'masks', string];

export function ActiveRecipePanel({
  project,
  onNavigate,
  onToggle,
  onNavigateTool,
  onApplyPreset,
  onClear,
  customPresets,
  onCreatePreset,
  onApplyCustomPreset,
  onRenameCustomPreset,
  onUpdateCustomPreset,
  onExportCustomPreset,
  onDeleteCustomPreset,
  onImportPreset,
  presetMessage,
  collapsed = false,
  onToggleCollapsed,
  embedded = false
}: {
  project: PhotoProject;
  onNavigate: (section: AdjustmentSection) => void;
  onToggle: (key: AdjustmentKeyPrimitive, enabled: boolean) => void;
  onNavigateTool?: (tool: 'curves' | 'crop' | 'masks') => void;
  onApplyPreset?: (name: 'Natural' | 'Cinematic' | 'Monochrome') => void;
  onClear: () => void;
  customPresets: RecipePreset[];
  onCreatePreset: (name: string) => void;
  onApplyCustomPreset: (preset: RecipePreset) => void;
  onRenameCustomPreset: (preset: RecipePreset, name: string) => void;
  onUpdateCustomPreset: (preset: RecipePreset) => void;
  onExportCustomPreset: (preset: RecipePreset) => void;
  onDeleteCustomPreset: (preset: RecipePreset) => void;
  onImportPreset: () => void;
  presetMessage?: string;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  embedded?: boolean;
}): ReactElement {
  const [newPresetName, setNewPresetName] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');
  const modifiedAdjustments = adjustmentDefinitions.filter((definition) => project.isGlobalAdjustmentModified(AdjustmentKey.fromPrimitives(definition.key)));
  const recipeBlocks: RecipeBlock[] = [];
  if (project.hasCurveAdjustments()) recipeBlocks.push(['curves', 'Tone Curve']);
  if (project.hasGeometryAdjustments()) recipeBlocks.push(['crop', 'Crop & Geometry']);
  if (project.hasMasks()) recipeBlocks.push(['masks', 'Local Masks']);
  const hasActiveRecipe = modifiedAdjustments.length > 0 || recipeBlocks.length > 0;

  const createPreset = (event: FormEvent): void => {
    event.preventDefault();
    if (newPresetName.trim().length === 0) return;
    onCreatePreset(newPresetName);
    setNewPresetName('');
  };

  if (collapsed) {
    return <aside className="recipe-panel collapsed" aria-label="Active Recipe collapsed">
      <button className="recipe-expand" type="button" onClick={onToggleCollapsed} aria-label="Expand Active Recipe" title="Expand Active Recipe"><span aria-hidden="true">›</span><strong>Recipe</strong></button>
    </aside>;
  }

  return (
    <aside className={`recipe-panel${embedded ? ' embedded' : ''}`} aria-label="Active Recipe">
      <div className="recipe-panel-heading">
        {!embedded && <button className="recipe-collapse" type="button" onClick={onToggleCollapsed} aria-label="Collapse Active Recipe" title="Collapse Active Recipe">‹</button>}
        <h2>Recipe</h2>
        <p>Every enabled change in the current image.</p>
        <div className="recipe-transfer-actions">
          <button type="button" disabled={!hasActiveRecipe} onClick={onClear}>Clear recipe</button>
          <button type="button" onClick={onImportPreset}>Import preset</button>
        </div>
        <div className="recipe-preset-section"><strong>Built-in looks</strong><div className="recipe-preset-actions" aria-label="Built-in development presets">
          {(['Natural', 'Cinematic', 'Monochrome'] as const).map((name) => (
            <button type="button" key={name} onClick={() => onApplyPreset?.(name)}>{name}</button>
          ))}
        </div></div>
        <section className="custom-recipe-presets" aria-label="My recipe presets">
          <strong>My presets</strong>
          <form onSubmit={createPreset}><input aria-label="New preset name" value={newPresetName} maxLength={80} placeholder="Name current recipe" onChange={(event) => setNewPresetName(event.target.value)} /><button type="submit" disabled={newPresetName.trim().length === 0}>Save</button></form>
          {customPresets.length === 0 && <small>No browser presets yet. Save the current recipe or import one.</small>}
          {customPresets.map((preset) => {
            const id = preset.getId().valueOf();
            const editing = editingPresetId === id;
            return <article key={id}>
              {editing ? <form onSubmit={(event) => { event.preventDefault(); onRenameCustomPreset(preset, editingPresetName); setEditingPresetId(null); }}><input aria-label={`Rename ${preset.getName().valueOf()}`} value={editingPresetName} maxLength={80} onChange={(event) => setEditingPresetName(event.target.value)} /><button type="submit">Done</button></form> : <strong>{preset.getName().valueOf()}</strong>}
              <div><button type="button" onClick={() => onApplyCustomPreset(preset)}>Apply</button><button type="button" onClick={() => onUpdateCustomPreset(preset)}>Update</button><button type="button" onClick={() => { setEditingPresetId(id); setEditingPresetName(preset.getName().valueOf()); }}>Rename</button><button type="button" onClick={() => onExportCustomPreset(preset)}>Export</button><button className="danger-text" type="button" onClick={() => onDeleteCustomPreset(preset)}>Delete</button></div>
            </article>;
          })}
        </section>
        {presetMessage !== undefined && <output className="recipe-transfer-message" aria-live="polite">{presetMessage}</output>}
      </div>
      <div className="recipe-items">
        {modifiedAdjustments.map((definition) => {
          const key = AdjustmentKey.fromPrimitives(definition.key);
          const value = project.getGlobalAdjustment(key).valueOf();
          const enabled = project.isGlobalAdjustmentEnabled(key);
          return (
            <div className={`recipe-item ${enabled ? '' : 'disabled'}`} key={definition.key}>
              <label className="recipe-toggle" title={`${enabled ? 'Disable' : 'Enable'} ${definition.label}`}>
                <input aria-label={`${definition.label} enabled`} type="checkbox" checked={enabled} onChange={(event) => onToggle(definition.key, event.target.checked)} />
                <span aria-hidden="true" />
              </label>
              <button type="button" aria-label={`${definition.label} ${value > 0 ? '+' : ''}${value}`} onClick={() => onNavigate(definition.section)}>
                <span>{definition.label}</span>
                <output>{value > 0 ? '+' : ''}{value}</output>
              </button>
            </div>
          );
        })}
        {modifiedAdjustments.length === 0 && recipeBlocks.length === 0 && <div className="recipe-empty"><strong>No active edits</strong><p>Changed parameters appear here. Reset values disappear automatically.</p></div>}
        {recipeBlocks.length > 0 && <div className="recipe-blocks-heading">Recipe blocks</div>}
        {recipeBlocks.map(([tool, label]) => (
          <button className="recipe-block" type="button" key={tool} onClick={() => onNavigateTool?.(tool)}>
            <span>{label}</span><span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
