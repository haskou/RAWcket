import type { ReactElement } from 'react';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import { AdjustmentKey, type AdjustmentKeyPrimitive } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import { adjustmentDefinitions, type AdjustmentSection } from '../editor/adjustmentDefinitions';

export function ActiveRecipePanel({
  project,
  onNavigate,
  onToggle,
  onNavigateTool,
  onCopy,
  onPaste,
  onApplyPreset,
  transferMessage
}: {
  project: PhotoProject;
  onNavigate: (section: AdjustmentSection) => void;
  onToggle: (key: AdjustmentKeyPrimitive, enabled: boolean) => void;
  onNavigateTool?: (tool: 'curves' | 'crop' | 'masks') => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onApplyPreset?: (name: 'Natural' | 'Cinematic' | 'Monochrome') => void;
  transferMessage?: string;
}): ReactElement {
  return (
    <aside className="recipe-panel" aria-label="Active Recipe">
      <div className="recipe-panel-heading">
        <span className="eyebrow">Non-destructive</span>
        <h2>Active Recipe</h2>
        <p>Toggle any instruction without losing its value. Select it to edit.</p>
        <div className="recipe-transfer-actions">
          <button type="button" onClick={onCopy}>Copy</button>
          <button type="button" onClick={onPaste}>Paste</button>
        </div>
        <div className="recipe-preset-actions" aria-label="Built-in development presets">
          {(['Natural', 'Cinematic', 'Monochrome'] as const).map((name) => (
            <button type="button" key={name} onClick={() => onApplyPreset?.(name)}>{name}</button>
          ))}
        </div>
        {transferMessage !== undefined && <output className="recipe-transfer-message" aria-live="polite">{transferMessage}</output>}
      </div>
      <div className="recipe-items">
        {adjustmentDefinitions.map((definition) => {
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
        <div className="recipe-blocks-heading">Recipe blocks</div>
        {([
          ['curves', 'Tone Curve'],
          ['crop', 'Crop & Geometry'],
          ['masks', 'Local Masks']
        ] as const).map(([tool, label]) => (
          <button className="recipe-block" type="button" key={tool} onClick={() => onNavigateTool?.(tool)}>
            <span>{label}</span><span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
