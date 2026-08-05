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

  it('keeps spatial adjustments on the WebGPU path before falling back for missing hardware', async () => {
    const requestAdapter = vi.fn().mockResolvedValue(null);
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: { requestAdapter } });
    const development = settings();
    development.adjustments.texture = 1;

    await expect(new WebGpuPixelDeveloper().develop(
      new Uint8ClampedArray([64, 32, 16, 255]),
      1,
      1,
      development
    )).resolves.toBeNull();
    expect(requestAdapter).toHaveBeenCalledWith({ powerPreference: 'high-performance' });
  });

  it('returns control to the fallback pipeline when a GPU device cannot be acquired', async () => {
    const requestDevice = vi.fn().mockRejectedValue(new Error('Device was lost during acquisition'));
    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      value: { requestAdapter: vi.fn().mockResolvedValue({ limits: { maxStorageBufferBindingSize: 1_000_000 }, requestDevice }) }
    });

    await expect(new WebGpuPixelDeveloper().develop(
      new Uint8ClampedArray([64, 32, 16, 255]),
      1,
      1,
      settings()
    )).resolves.toBeNull();
    expect(requestDevice).toHaveBeenCalledTimes(1);
  });
});
