import { ViewportTransform } from '@/contexts/projects/domain/ViewportTransform';

describe('ViewportTransform', () => {
  it('reveals the full crop frame without discarding geometry corrections', () => {
    const viewport = ViewportTransform.fromPrimitives({
      cropFrame: { x: 0.12, y: 0.2, width: 0.7, height: 0.6 },
      translation: { x: 0.45, y: 0.55 },
      scale: 1.2,
      rotationDegrees: 3.5,
      horizontalPerspective: -8,
      verticalPerspective: 12,
      flipHorizontal: true,
      flipVertical: false,
      aspectRatio: { width: 3, height: 2 }
    });

    expect(viewport.revealFullCropFrame().toPrimitives()).toEqual({
      ...viewport.toPrimitives(),
      cropFrame: { x: 0, y: 0, width: 1, height: 1 }
    });
    expect(viewport.toPrimitives().cropFrame).toEqual({ x: 0.12, y: 0.2, width: 0.7, height: 0.6 });
  });
});
