import { expect, test } from '@playwright/test';
import type { CpuPixelDeveloper as CpuPixelDeveloperClass } from '@/contexts/projects/infrastructure/renderers/CpuPixelDeveloper';
import type { CpuDevelopmentSettings } from '@/contexts/projects/infrastructure/renderers/CpuPixelDeveloper';
import type { CpuMaskWeightRasterizer as CpuMaskWeightRasterizerClass } from '@/contexts/projects/infrastructure/renderers/CpuMaskWeightRasterizer';
import type { WebGl2PixelDeveloper as WebGl2PixelDeveloperClass } from '@/contexts/projects/infrastructure/renderers/WebGl2PixelDeveloper';
import type { WebGpuPixelDeveloper as WebGpuPixelDeveloperClass } from '@/contexts/projects/infrastructure/renderers/WebGpuPixelDeveloper';

test('keeps accelerated masked spatial development within the CPU reference tolerance', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const cpuUrl = '/src/contexts/projects/infrastructure/renderers/CpuPixelDeveloper.ts';
    const cpuMaskUrl = '/src/contexts/projects/infrastructure/renderers/CpuMaskWeightRasterizer.ts';
    const webGlUrl = '/src/contexts/projects/infrastructure/renderers/WebGl2PixelDeveloper.ts';
    const webGpuUrl = '/src/contexts/projects/infrastructure/renderers/WebGpuPixelDeveloper.ts';
    const { CpuPixelDeveloper } = await import(cpuUrl) as unknown as { CpuPixelDeveloper: typeof CpuPixelDeveloperClass };
    const { CpuMaskWeightRasterizer } = await import(cpuMaskUrl) as unknown as { CpuMaskWeightRasterizer: typeof CpuMaskWeightRasterizerClass };
    const { WebGl2PixelDeveloper } = await import(webGlUrl) as unknown as { WebGl2PixelDeveloper: typeof WebGl2PixelDeveloperClass };
    const { WebGpuPixelDeveloper } = await import(webGpuUrl) as unknown as { WebGpuPixelDeveloper: typeof WebGpuPixelDeveloperClass };
    const identity = { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' as const };
    const settings: CpuDevelopmentSettings = {
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
        },
        {
          id: '00000000-0000-4000-8000-000000000003', enabled: true, inverted: false,
          opacity: 0.65, feather: 0.3, density: 0.9, expansion: 0.01, localAdjustments: { contrast: 9 },
          shape: {
            kind: 'brush' as const,
            strokes: [
              { points: [{ x: 0.15, y: 0.2, pressure: 0.5 }, { x: 0.75, y: 0.72, pressure: 1 }], size: 0.3, hardness: 0.55, flow: 0.8, mode: 'add' as const },
              { points: [{ x: 0.48, y: 0.48, pressure: 0.8 }], size: 0.12, hardness: 1, flow: 1, mode: 'erase' as const }
            ]
          }
        },
        {
          id: '00000000-0000-4000-8000-000000000004', enabled: true, inverted: false,
          opacity: 0.55, feather: 0.4, density: 0.8, localAdjustments: { vibrance: 14 },
          shape: {
            kind: 'composite' as const,
            operation: 'add' as const,
            children: [
              {
                id: '00000000-0000-4000-8000-000000000005', enabled: true, inverted: false, opacity: 1, feather: 0, density: 1, localAdjustments: {},
                shape: { kind: 'linear-gradient' as const, start: { x: 0, y: 0.2 }, end: { x: 1, y: 0.8 } }
              },
              {
                id: '00000000-0000-4000-8000-000000000006', enabled: true, inverted: false, opacity: 1, feather: 0, density: 1, localAdjustments: {},
                shape: {
                  kind: 'composite' as const,
                  operation: 'intersect' as const,
                  children: [
                    {
                      id: '00000000-0000-4000-8000-000000000007', enabled: true, inverted: false, opacity: 1, feather: 0, density: 1, localAdjustments: {},
                      shape: { kind: 'color-range' as const, samples: [{ x: 0.25, y: 0.25 }, { x: 0.75, y: 0.75 }], tolerance: 0.38 }
                    },
                    {
                      id: '00000000-0000-4000-8000-000000000008', enabled: true, inverted: false, opacity: 1, feather: 0, density: 1, localAdjustments: {},
                      shape: {
                        kind: 'composite' as const,
                        operation: 'subtract' as const,
                        children: [
                          {
                            id: '00000000-0000-4000-8000-000000000009', enabled: true, inverted: false, opacity: 1, feather: 0, density: 1, localAdjustments: {},
                            shape: { kind: 'radial' as const, center: { x: 0.5, y: 0.5 }, radiusX: 0.45, radiusY: 0.45, rotationDegrees: 0 }
                          },
                          {
                            id: '00000000-0000-4000-8000-000000000010', enabled: true, inverted: false, opacity: 1, feather: 0, density: 1, localAdjustments: {},
                            shape: {
                              kind: 'ai-segmentation' as const, prompt: 'center highlight',
                              positivePoints: [{ x: 0.5, y: 0.5 }], negativePoints: [{ x: 0.05, y: 0.05 }],
                              boundingBoxes: [{ x: 0.35, y: 0.35, width: 0.3, height: 0.3 }],
                              strategy: 'local-spatial-luminance', version: '1', rasterCacheKey: null
                            }
                          },
                          {
                            id: '00000000-0000-4000-8000-000000000011', enabled: true, inverted: false, opacity: 0.45, feather: 0.2, density: 0.8, localAdjustments: {},
                            shape: { kind: 'linear-gradient' as const, start: { x: 1, y: 0 }, end: { x: 0, y: 1 } }
                          }
                        ]
                      }
                    }
                  ]
                }
              }
            ]
          }
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
    CpuMaskWeightRasterizer.prototype.rasterize = (): never => { throw new Error('Accelerated paths must not invoke CPU mask rasterization.'); };
    const webGpuAdapterAvailable = typeof navigator.gpu === 'object' && await navigator.gpu.requestAdapter() !== null;
    const maximumDelta = (candidate: Uint8ClampedArray | null): number | null => candidate === null
      ? null
      : candidate.reduce((maximum, value, index) => Math.max(maximum, Math.abs(value - (reference[index] ?? 0))), 0);
    const webGpuCandidate = await new WebGpuPixelDeveloper().develop(source, width, height, settings);
    return {
      webGpuAdapterAvailable,
      webGl: maximumDelta(new WebGl2PixelDeveloper().develop(source, width, height, settings)),
      webGpu: maximumDelta(webGpuCandidate)
    };
  });

  expect(result.webGl).not.toBeNull();
  expect(result.webGl ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(8);
  if (result.webGpuAdapterAvailable) {
    expect(result.webGpu).not.toBeNull();
    expect(result.webGpu ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(8);
  }
});
