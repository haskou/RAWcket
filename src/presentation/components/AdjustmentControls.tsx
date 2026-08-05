import { useRef, type ReactElement } from 'react';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import { AdjustmentKey, type AdjustmentKeyPrimitive } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import type { AdjustmentDefinition } from '../editor/adjustmentDefinitions';

export function AdjustmentControls({ project, definitions, onChange }: {
  project: PhotoProject;
  definitions: readonly AdjustmentDefinition[];
  onChange: (key: AdjustmentKeyPrimitive, value: number, groupId: string | null) => void;
}): ReactElement {
  const groups = useRef(new Map<AdjustmentKeyPrimitive, string>());

  return (
    <div className="adjustment-list">
      {definitions.map((definition) => {
        const value = project.getGlobalAdjustment(AdjustmentKey.fromPrimitives(definition.key)).valueOf();
        const enabled = project.isGlobalAdjustmentEnabled(AdjustmentKey.fromPrimitives(definition.key));
        return (
          <div className={`adjustment-control ${enabled ? '' : 'disabled'}`} key={definition.key}>
            <div className="adjustment-control-heading">
              <label htmlFor={`adjustment-${definition.key}`}>{definition.label}</label>
              <div className="numeric-control">
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
                <button type="button" disabled={!enabled || value === 0} onClick={() => onChange(definition.key, 0, null)} aria-label={`Reset ${definition.label}`}>↺</button>
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
              aria-valuetext={`${value}`}
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
