import { expect, test } from '@playwright/test';
import type { CpuPixelDeveloper as CpuPixelDeveloperClass } from '@/contexts/projects/infrastructure/renderers/CpuPixelDeveloper';
import type { WebGl2PixelDeveloper as WebGl2PixelDeveloperClass } from '@/contexts/projects/infrastructure/renderers/WebGl2PixelDeveloper';
import type { WebGpuPixelDeveloper as WebGpuPixelDeveloperClass } from '@/contexts/projects/infrastructure/renderers/WebGpuPixelDeveloper';

test('keeps accelerated masked spatial development within the CPU reference tolerance', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const cpuUrl = '/src/contexts/projects/infrastructure/renderers/CpuPixelDeveloper.ts';
    const webGlUrl = '/src/contexts/projects/infrastructure/renderers/WebGl2PixelDeveloper.ts';
    const webGpuUrl = '/src/contexts/projects/infrastructure/renderers/WebGpuPixelDeveloper.ts';
    const { CpuPixelDeveloper } = await import(cpuUrl) as unknown as { CpuPixelDeveloper: typeof CpuPixelDeveloperClass };
    const { WebGl2PixelDeveloper } = await import(webGlUrl) as unknown as { WebGl2PixelDeveloper: typeof WebGl2PixelDeveloperClass };
    const { WebGpuPixelDeveloper } = await import(webGpuUrl) as unknown as { WebGpuPixelDeveloper: typeof WebGpuPixelDeveloperClass };
    const identity = { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' as const };
    const settings = {
      adjustments: {
        exposure: 0.2, temperature: 4, tint: -2, contrast: 12, highlights: -8, shadows: 6,
        whites: 3, blacks: -4, saturation: 5, vibrance: 8, clarity: 7, texture: 25,
        dehaze: 3, sharpness: 20, noiseReduction: 15, vignette: -6
      },
      curves: { rgb: identity, red: identity, green: identity, blue: identity, luminance: null },
      disabledAdjustments: [],
      masks: [
        {
          id: '00000000-0000-4000-8000-000000000001', enabled: true, inverted: false,
          opacity: 0.8, feather: 0.6, density: 0.9, localAdjustments: { exposure: 0.45, saturation: 12 },
          shape: { kind: 'radial' as const, center: { x: 0.5, y: 0.5 }, radiusX: 0.36, radiusY: 0.42, rotationDegrees: 12 }
        },
        {
          id: '00000000-0000-4000-8000-000000000002', enabled: true, inverted: false,
          opacity: 0.5, feather: 0, density: 1, localAdjustments: { shadows: 18, temperature: -6 },
          shape: { kind: 'luminance-range' as const, minimum: 0.25, maximum: 0.7 }
        }
      ]
    };
    const width = 5;
    const height = 5;
    const source = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const distance = Math.abs(x - 2) + Math.abs(y - 2);
        const index = (y * width + x) * 4;
        source[index] = 210 - distance * 24;
        source[index + 1] = 150 - distance * 14;
        source[index + 2] = 80 + distance * 18;
        source[index + 3] = 255;
      }
    }
    const reference = new CpuPixelDeveloper().develop(source, width, height, settings);
    const maximumDelta = (candidate: Uint8ClampedArray | null): number | null => candidate === null
      ? null
      : candidate.reduce((maximum, value, index) => Math.max(maximum, Math.abs(value - (reference[index] ?? 0))), 0);
    return {
      webGl: maximumDelta(new WebGl2PixelDeveloper().develop(source, width, height, settings)),
      webGpu: maximumDelta(await new WebGpuPixelDeveloper().develop(source, width, height, settings))
    };
  });

  expect(result.webGl).not.toBeNull();
  expect(result.webGl ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(8);
  if (result.webGpu !== null) expect(result.webGpu).toBeLessThanOrEqual(8);
});
