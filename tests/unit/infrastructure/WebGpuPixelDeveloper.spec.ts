import { CurveSet } from '@/contexts/projects/domain/ToneCurve';
import { GlobalAdjustments } from '@/contexts/projects/domain/GlobalAdjustments';
import type { CpuDevelopmentSettings } from '@/contexts/projects/infrastructure/renderers/CpuPixelDeveloper';
import { WebGpuPixelDeveloper } from '@/contexts/projects/infrastructure/renderers/WebGpuPixelDeveloper';

const originalGpu = Object.getOwnPropertyDescriptor(navigator, 'gpu');

function settings(): CpuDevelopmentSettings {
  return {
    adjustments: GlobalAdjustments.neutral().toPrimitives(),
    curves: CurveSet.identity().toPrimitives(),
    disabledAdjustments: [],
    masks: []
  };
}

afterEach(() => {
  if (originalGpu === undefined) Reflect.deleteProperty(navigator, 'gpu');
  else Object.defineProperty(navigator, 'gpu', originalGpu);
});

describe('WebGpuPixelDeveloper', () => {
  it('returns control to the fallback pipeline when WebGPU is unavailable', async () => {
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: undefined });

    await expect(new WebGpuPixelDeveloper().develop(
      new Uint8ClampedArray([64, 32, 16, 255]),
      1,
      1,
      settings()
    )).resolves.toBeNull();
  });

  it('does not request a GPU adapter for unsupported spatial adjustments', async () => {
    const requestAdapter = vi.fn();
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: { requestAdapter } });
    const development = settings();
    development.adjustments.texture = 1;

    await expect(new WebGpuPixelDeveloper().develop(
      new Uint8ClampedArray([64, 32, 16, 255]),
      1,
      1,
      development
    )).resolves.toBeNull();
    expect(requestAdapter).not.toHaveBeenCalled();
  });
});
