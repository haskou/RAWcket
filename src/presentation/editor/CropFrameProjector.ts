import type { ViewportTransformPrimitives } from '@/contexts/projects/domain/ViewportTransform';

export type CropPoint = { x: number; y: number };
export type CropAspectRatio = { width: number; height: number } | null;

export class CropFrameProjector {
  public static draw(
    anchor: CropPoint,
    pointer: CropPoint,
    aspectRatio: CropAspectRatio,
    imageDimensions: { width: number; height: number }
  ): ViewportTransformPrimitives['cropFrame'] {
    let width = Math.abs(pointer.x - anchor.x);
    let height = Math.abs(pointer.y - anchor.y);
    if (aspectRatio !== null && width > 0 && height > 0) {
      const normalizedRatio = (aspectRatio.width / aspectRatio.height) / (imageDimensions.width / imageDimensions.height);
      if (width / height > normalizedRatio) width = height * normalizedRatio;
      else height = width / normalizedRatio;
    }
    const x = pointer.x >= anchor.x ? anchor.x : anchor.x - width;
    const y = pointer.y >= anchor.y ? anchor.y : anchor.y - height;
    return CropFrameProjector.insideImage({ x, y, width, height });
  }

  public static move(
    crop: ViewportTransformPrimitives['cropFrame'],
    pointerStart: CropPoint,
    pointer: CropPoint
  ): ViewportTransformPrimitives['cropFrame'] {
    return {
      ...crop,
      x: CropFrameProjector.clamp(crop.x + pointer.x - pointerStart.x, 0, 1 - crop.width),
      y: CropFrameProjector.clamp(crop.y + pointer.y - pointerStart.y, 0, 1 - crop.height)
    };
  }

  public static contains(crop: ViewportTransformPrimitives['cropFrame'], point: CropPoint): boolean {
    return point.x >= crop.x && point.x <= crop.x + crop.width
      && point.y >= crop.y && point.y <= crop.y + crop.height;
  }

  public static fillsImage(crop: ViewportTransformPrimitives['cropFrame']): boolean {
    return crop.x === 0 && crop.y === 0 && crop.width === 1 && crop.height === 1;
  }

  private static insideImage(crop: ViewportTransformPrimitives['cropFrame']): ViewportTransformPrimitives['cropFrame'] {
    const x = CropFrameProjector.clamp(crop.x, 0, 1);
    const y = CropFrameProjector.clamp(crop.y, 0, 1);
    return {
      x,
      y,
      width: CropFrameProjector.clamp(crop.width, 0, 1 - x),
      height: CropFrameProjector.clamp(crop.height, 0, 1 - y)
    };
  }

  private static clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
  }
}
