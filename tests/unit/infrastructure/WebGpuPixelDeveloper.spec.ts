import { CurveSet } from '@/contexts/projects/domain/ToneCurve';
import { GlobalAdjustments } from '@/contexts/projects/domain/GlobalAdjustments';
import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
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

function radialMask(index: number): MaskDefinitionPrimitives {
  return {
    id: `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
    enabled: true,
    inverted: false,
    opacity: 1,
    feather: 0,
    density: 1,
    localAdjustments: { exposure: 0.1 },
    shape: { kind: 'radial', center: { x: 0.5, y: 0.5 }, radiusX: 0.2, radiusY: 0.2, rotationDegrees: 0 }
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

  it('falls back instead of dropping masks when the recipe exceeds the bounded GPU plane count', async () => {
    const development = settings();
    development.masks = Array.from({ length: 33 }, (_, index) => radialMask(index));
    const requestAdapter = vi.fn();
    Object.defineProperty(navigator, 'gpu', { configurable: true, value: { requestAdapter } });

    await expect(new WebGpuPixelDeveloper().develop(
      new Uint8ClampedArray([64, 32, 16, 255]),
      1,
      1,
      development
    )).resolves.toBeNull();
    expect(requestAdapter).not.toHaveBeenCalled();
  });
});
