import type { CpuDevelopmentSettings } from '@/contexts/projects/infrastructure/renderers/CpuPixelDeveloper';
import { CpuPixelDeveloper } from '@/contexts/projects/infrastructure/renderers/CpuPixelDeveloper';

const identity = { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' as const };
const neutralAdjustments = {
  exposure: 0, temperature: 0, tint: 0, contrast: 0, highlights: 0, shadows: 0,
  whites: 0, blacks: 0, saturation: 0, vibrance: 0, clarity: 0, texture: 0,
  dehaze: 0, sharpness: 0, noiseReduction: 0, vignette: 0
};

function source(width: number, height: number): Uint8ClampedArray<ArrayBuffer> {
  const pixels = new Uint8ClampedArray(new ArrayBuffer(width * height * 4));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      pixels[index] = Math.round(x / Math.max(1, width - 1) * 255);
      pixels[index + 1] = Math.round(y / Math.max(1, height - 1) * 255);
      pixels[index + 2] = (x * 47 + y * 29) % 256;
      pixels[index + 3] = 255;
    }
  }
  return pixels;
}

function settings(overrides: Partial<CpuDevelopmentSettings> = {}): CpuDevelopmentSettings {
  return {
    adjustments: { ...neutralAdjustments },
    curves: { rgb: identity, red: identity, green: identity, blue: identity, luminance: null },
    disabledAdjustments: [],
    masks: [],
    ...overrides
  };
}

async function digest(pixels: Uint8ClampedArray<ArrayBuffer>): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', pixels);
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

describe('CpuPixelDeveloper golden images', () => {
  it.each([
    {
      name: 'neutral gradient', width: 6, height: 4,
      settings: settings(),
      expected: 'f66568b6f3575be9c3e31a68015d338547d6e5a6a10005c82b943c7323ef3cb2'
    },
    {
      name: 'tonal and channel development', width: 7, height: 5,
      settings: settings({
        adjustments: {
          ...neutralAdjustments, exposure: 0.35, temperature: 18, tint: -7, contrast: 24,
          highlights: -31, shadows: 22, whites: 9, blacks: -13, saturation: 11,
          vibrance: 17, clarity: 14, dehaze: 8, vignette: -16
        },
        curves: {
          rgb: { points: [{ x: 0, y: 0 }, { x: 0.22, y: 0.16 }, { x: 0.72, y: 0.81 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
          red: { points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.54 }, { x: 1, y: 1 }], interpolation: 'linear' },
          green: identity,
          blue: { points: [{ x: 0, y: 0.03 }, { x: 0.5, y: 0.47 }, { x: 1, y: 0.98 }], interpolation: 'monotonic-cubic' },
          luminance: { points: [{ x: 0, y: 0 }, { x: 0.4, y: 0.36 }, { x: 1, y: 1 }], interpolation: 'linear' }
        }
      }),
      expected: '87d7c3d391885a1d852a10debff3fde46bfe1beb497ab7d260a2ee872f2d2b2a'
    },
    {
      name: 'masked spatial development', width: 8, height: 6,
      settings: settings({
        adjustments: { ...neutralAdjustments, texture: 35, sharpness: 22, noiseReduction: 18 },
        masks: [{
          id: '00000000-0000-4000-8000-000000000010', enabled: true, inverted: false,
          opacity: 0.85, feather: 0.7, density: 0.9,
          localAdjustments: { exposure: 0.6, temperature: -12, saturation: 20 },
          shape: { kind: 'radial', center: { x: 0.52, y: 0.46 }, radiusX: 0.32, radiusY: 0.4, rotationDegrees: 17 }
        }, {
          id: '00000000-0000-4000-8000-000000000011', enabled: true, inverted: true,
          opacity: 0.4, feather: 0, density: 1,
          localAdjustments: { shadows: -18, dehaze: 12 },
          shape: { kind: 'linear-gradient', start: { x: 0.1, y: 0.2 }, end: { x: 0.9, y: 0.8 } }
        }]
      }),
      expected: 'd6d502980aac8b7421aa8b9279f75f3962df6bffc8dc8037c6ec0b8e2de895c2'
    }
  ])('keeps the $name reference stable', async ({ width, height, settings: development, expected }) => {
    const output = new CpuPixelDeveloper().develop(source(width, height), width, height, development);
    await expect(digest(output)).resolves.toBe(expected);
  });
});
