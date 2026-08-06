import { useRef, type ReactElement } from 'react';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import { AdjustmentKey, type AdjustmentKeyPrimitive } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import type { AdjustmentDefinition } from '../editor/adjustmentDefinitions';

export function AdjustmentControls({ project, definitions, onChange, onToggle }: {
  project: PhotoProject;
  definitions: readonly AdjustmentDefinition[];
  onChange: (key: AdjustmentKeyPrimitive, value: number, groupId: string | null) => void;
  onToggle?: (key: AdjustmentKeyPrimitive, enabled: boolean) => void;
}): ReactElement {
  const groups = useRef(new Map<AdjustmentKeyPrimitive, string>());

  return (
    <div className="adjustment-list">
      {definitions.map((definition) => {
        const value = project.getGlobalAdjustment(AdjustmentKey.fromPrimitives(definition.key)).valueOf();
        const enabled = project.isGlobalAdjustmentEnabled(AdjustmentKey.fromPrimitives(definition.key));
        const modified = project.isGlobalAdjustmentModified(AdjustmentKey.fromPrimitives(definition.key));
        return (
          <div className={`adjustment-control ${enabled ? '' : 'disabled'} ${modified ? 'modified' : ''}`} key={definition.key}>
            <div className="adjustment-control-heading">
              <label htmlFor={`adjustment-${definition.key}`} title={modified ? 'Changed from the default value' : 'Default value'}>{definition.label}{modified && <span className="modified-mark" aria-label="Modified">●</span>}</label>
              <div className="numeric-control">
                {onToggle !== undefined && <button className="adjustment-enable" type="button" aria-label={`${enabled ? 'Disable' : 'Enable'} ${definition.label}`} aria-pressed={enabled} onClick={() => onToggle(definition.key, !enabled)} title={`${enabled ? 'Disable' : 'Enable'} this instruction`}>{enabled ? '◉' : '○'}</button>}
                <input
                  aria-label={`${definition.label} numeric value`}
                  type="number"
                  min={definition.minimum}
                  max={definition.maximum}
                  step={definition.step}
                  value={value}
                  disabled={!enabled}
                  onChange={(event) => onChange(definition.key, event.currentTarget.valueAsNumber, null)}
                />
                <span className="adjustment-unit" aria-hidden="true">{definition.unit}</span>
                <button className="adjustment-reset" type="button" disabled={!enabled || !modified} onClick={() => onChange(definition.key, 0, null)} aria-label={`Reset ${definition.label}`} title="Reset to default">↺</button>
              </div>
            </div>
            <input
              id={`adjustment-${definition.key}`}
              className="adjustment-slider"
              type="range"
              min={definition.minimum}
              max={definition.maximum}
              step={definition.step}
              value={value}
              disabled={!enabled}
              aria-valuetext={`${value} ${definition.unit}`}
              title="Double-click to reset"
              onDoubleClick={() => onChange(definition.key, 0, null)}
              onPointerDown={() => groups.current.set(definition.key, crypto.randomUUID())}
              onPointerUp={() => groups.current.delete(definition.key)}
              onChange={(event) => onChange(
                definition.key,
                event.currentTarget.valueAsNumber,
                groups.current.get(definition.key) ?? null
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
