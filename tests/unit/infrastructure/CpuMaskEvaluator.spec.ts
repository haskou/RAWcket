import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import { CpuMaskEvaluator } from '@/contexts/projects/infrastructure/renderers/CpuMaskEvaluator';

function brushMask(overrides: Partial<MaskDefinitionPrimitives> = {}): MaskDefinitionPrimitives {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    inverted: false,
    opacity: 1,
    feather: 0,
    density: 1,
    localAdjustments: {},
    shape: { kind: 'brush', strokes: [{ points: [{ x: 0.5, y: 0.5 }], size: 0.4, hardness: 1, flow: 1 }] },
    ...overrides
  };
}

describe('CpuMaskEvaluator', () => {
  it('evaluates brush coverage from normalized stroke geometry', () => {
    const evaluator = new CpuMaskEvaluator();
    const mask = brushMask();

    expect(evaluator.evaluate(mask, { x: 0.5, y: 0.5, luminance: 0.5 })).toBe(1);
    expect(evaluator.evaluate(mask, { x: 0, y: 0, luminance: 0.5 })).toBe(0);
  });

  it('combines inversion, opacity, and density without mutating the shape', () => {
    const evaluator = new CpuMaskEvaluator();
    const mask = brushMask({ inverted: true, opacity: 0.5, density: 0.5 });

    expect(evaluator.evaluate(mask, { x: 0, y: 0, luminance: 0.5 })).toBe(0.25);
    expect(evaluator.evaluate(mask, { x: 0.5, y: 0.5, luminance: 0.5 })).toBe(0);
  });
});
