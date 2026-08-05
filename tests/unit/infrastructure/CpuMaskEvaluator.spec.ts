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

  it('subtracts ordered eraser strokes and uses point pressure for brush diameter', () => {
    const evaluator = new CpuMaskEvaluator();
    const mask = brushMask({
      shape: { kind: 'brush', strokes: [
        { mode: 'add', points: [{ x: 0.5, y: 0.5, pressure: 1 }], size: 0.4, hardness: 1, flow: 1 },
        { mode: 'erase', points: [{ x: 0.5, y: 0.5, pressure: 1 }], size: 0.1, hardness: 1, flow: 1 }
      ] }
    });
    const lightPressure = brushMask({
      shape: { kind: 'brush', strokes: [{ mode: 'add', points: [{ x: 0.5, y: 0.5, pressure: 0.25 }], size: 0.4, hardness: 1, flow: 1 }] }
    });

    expect(evaluator.evaluate(mask, { x: 0.5, y: 0.5, luminance: 0.5 })).toBe(0);
    expect(evaluator.evaluate(mask, { x: 0.62, y: 0.5, luminance: 0.5 })).toBe(1);
    expect(evaluator.evaluate(lightPressure, { x: 0.6, y: 0.5, luminance: 0.5 })).toBe(0);
  });

  it('expands and contracts vector mask coverage deterministically', () => {
    const evaluator = new CpuMaskEvaluator();
    const expanded = brushMask({ expansion: 0.1 });
    const contracted = brushMask({ expansion: -0.15 });

    expect(evaluator.evaluate(expanded, { x: 0.75, y: 0.5, luminance: 0.5 })).toBeGreaterThan(0);
    expect(evaluator.evaluate(contracted, { x: 0.6, y: 0.5, luminance: 0.5 })).toBe(0);
  });

  it('combines inversion, opacity, and density without mutating the shape', () => {
    const evaluator = new CpuMaskEvaluator();
    const mask = brushMask({ inverted: true, opacity: 0.5, density: 0.5 });

    expect(evaluator.evaluate(mask, { x: 0, y: 0, luminance: 0.5 })).toBe(0.25);
    expect(evaluator.evaluate(mask, { x: 0.5, y: 0.5, luminance: 0.5 })).toBe(0);
  });

  it('expands local smart points only across nearby, luminance-similar pixels', () => {
    const evaluator = new CpuMaskEvaluator();
    const mask = brushMask({
      shape: {
        kind: 'ai-segmentation',
        prompt: 'subject',
        positivePoints: [{ x: 0.5, y: 0.5 }],
        negativePoints: [],
        boundingBoxes: [],
        strategy: 'local-spatial-luminance',
        version: '1',
        rasterCacheKey: null
      }
    });

    expect(evaluator.evaluate(mask, { x: 0.6, y: 0.5, luminance: 0.52, sourceLuminanceAt: () => 0.5 })).toBe(1);
    expect(evaluator.evaluate(mask, { x: 0.6, y: 0.5, luminance: 0.9, sourceLuminanceAt: () => 0.5 })).toBe(0);
  });

  it('renders editable linear gradients and luminance ranges', () => {
    const evaluator = new CpuMaskEvaluator();
    const linear = brushMask({ shape: { kind: 'linear-gradient', start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } } });
    const luminance = brushMask({ shape: { kind: 'luminance-range', minimum: 0.4, maximum: 0.7 } });

    expect(evaluator.evaluate(linear, { x: 0.25, y: 0.5, luminance: 0.5 })).toBeCloseTo(0.25);
    expect(evaluator.evaluate(linear, { x: 0.75, y: 0.5, luminance: 0.5 })).toBeCloseTo(0.75);
    expect(evaluator.evaluate(luminance, { x: 0.5, y: 0.5, luminance: 0.55 })).toBe(1);
    expect(evaluator.evaluate(luminance, { x: 0.5, y: 0.5, luminance: 0.8 })).toBe(0);
  });

  it('uses negative smart points and bounding boxes as inspectable constraints', () => {
    const evaluator = new CpuMaskEvaluator();
    const mask = brushMask({
      shape: {
        kind: 'ai-segmentation',
        prompt: 'subject',
        positivePoints: [{ x: 0.5, y: 0.5 }],
        negativePoints: [{ x: 0.6, y: 0.5 }],
        boundingBoxes: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }],
        strategy: 'local-spatial-luminance',
        version: '1',
        rasterCacheKey: null
      }
    });

    expect(evaluator.evaluate(mask, { x: 0.2, y: 0.2, luminance: 0.9 })).toBe(1);
    expect(evaluator.evaluate(mask, { x: 0.6, y: 0.5, luminance: 0.5, sourceLuminanceAt: () => 0.5 })).toBe(0);
  });

  it('matches sampled source colors independently of pixel position', () => {
    const evaluator = new CpuMaskEvaluator();
    const mask = brushMask({ shape: { kind: 'color-range', samples: [{ x: 0.1, y: 0.1 }], tolerance: 0.12 } });
    const sampledRed = (): readonly [number, number, number] => [1, 0, 0];

    expect(evaluator.evaluate(mask, { x: 0.9, y: 0.9, luminance: 0.2, color: [0.98, 0.01, 0.01], sourceColorAt: sampledRed })).toBeGreaterThan(0.9);
    expect(evaluator.evaluate(mask, { x: 0.1, y: 0.1, luminance: 0.7, color: [0, 1, 0], sourceColorAt: sampledRed })).toBe(0);
  });
});
