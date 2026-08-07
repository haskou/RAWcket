import { useRef, type ReactElement } from 'react';
import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import type { AdjustmentKeyPrimitive } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import type { AdjustmentDefinition } from '../editor/adjustmentDefinitions';

export function MaskAdjustmentControls({ mask, definitions, onChange }: {
  mask: MaskDefinitionPrimitives;
  definitions: readonly AdjustmentDefinition[];
  onChange: (key: AdjustmentKeyPrimitive, value: number, groupId: string | null) => void;
}): ReactElement {
  const groups = useRef(new Map<AdjustmentKeyPrimitive, string>());

  return <div className="adjustment-list local-adjustment-list">
    {definitions.map((definition) => {
      const value = mask.localAdjustments[definition.key] ?? 0;
      const modified = value !== 0;
      const inputId = `mask-adjustment-${mask.id}-${definition.key}`;
      return <div className={`adjustment-control${modified ? ' modified' : ''}`} key={definition.key}>
        <div className="adjustment-control-heading">
          <label htmlFor={inputId} title={modified ? 'Changed on this mask layer' : 'No local change'}>{definition.label}{modified && <span className="modified-mark" aria-label="Modified locally">●</span>}</label>
          <div className="numeric-control">
            <input
              aria-label={`Local ${definition.label} numeric value`}
              type="number"
              min={definition.minimum}
              max={definition.maximum}
              step={definition.step}
              value={value}
              onChange={(event) => onChange(definition.key, event.currentTarget.valueAsNumber, null)}
            />
            <span className="adjustment-unit" aria-hidden="true">{definition.unit}</span>
            <button className="adjustment-reset" type="button" disabled={!modified} onClick={() => onChange(definition.key, 0, null)} aria-label={`Reset local ${definition.label}`} title="Reset this mask-layer adjustment">↺</button>
          </div>
        </div>
        <input
          id={inputId}
          className="adjustment-slider"
          type="range"
          min={definition.minimum}
          max={definition.maximum}
          step={definition.step}
          value={value}
          aria-valuetext={`${value} ${definition.unit} on active mask`}
          title="Double-click to reset this mask-layer adjustment"
          onDoubleClick={() => onChange(definition.key, 0, null)}
          onPointerDown={() => groups.current.set(definition.key, crypto.randomUUID())}
          onPointerUp={() => groups.current.delete(definition.key)}
          onChange={(event) => onChange(definition.key, event.currentTarget.valueAsNumber, groups.current.get(definition.key) ?? null)}
        />
      </div>;
    })}
  </div>;
}
