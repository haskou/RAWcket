import { CurveSet } from '@/contexts/projects/domain/ToneCurve';
import { GlobalAdjustments } from '@/contexts/projects/domain/GlobalAdjustments';
import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import type { CpuDevelopmentSettings } from '@/contexts/projects/infrastructure/renderers/CpuPixelDeveloper';
import { WebGl2PixelDeveloper } from '@/contexts/projects/infrastructure/renderers/WebGl2PixelDeveloper';

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

describe('WebGl2PixelDeveloper', () => {
  it('falls back instead of dropping masks when the recipe exceeds its four GPU channels', () => {
    const settings: CpuDevelopmentSettings = {
      adjustments: GlobalAdjustments.neutral().toPrimitives(),
      curves: CurveSet.identity().toPrimitives(),
      disabledAdjustments: [],
      masks: Array.from({ length: 5 }, (_, index) => radialMask(index))
    };

    expect(new WebGl2PixelDeveloper().develop(
      new Uint8ClampedArray([64, 32, 16, 255]),
      1,
      1,
      settings
    )).toBeNull();
  });
});
