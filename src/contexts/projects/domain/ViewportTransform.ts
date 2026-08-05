import { AspectRatio, NormalizedCoordinate, NormalizedPoint, NormalizedRectangle } from './value-objects/Geometry';

export type ViewportTransformPrimitives = {
  cropFrame: { x: number; y: number; width: number; height: number };
  translation: { x: number; y: number };
  scale: number;
  rotationDegrees: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  aspectRatio: { width: number; height: number } | null;
};

export class ViewportTransform {
  public constructor(
    private readonly cropFrame: NormalizedRectangle,
    private readonly translation: NormalizedPoint,
    private readonly scale: number,
    private readonly rotationDegrees: number,
    private readonly flipHorizontal: boolean,
    private readonly flipVertical: boolean,
    private readonly aspectRatio: AspectRatio | null
  ) {
    if (!Number.isFinite(scale) || scale < 0.1 || scale > 32) {
      throw new Error('Zoom must be between 0.1 and 32.');
    }
    if (!Number.isFinite(rotationDegrees) || rotationDegrees < -180 || rotationDegrees > 180) {
      throw new Error('Rotation must be between -180 and 180 degrees.');
    }
  }

  public static reset(): ViewportTransform {
    return ViewportTransform.fromPrimitives({
      cropFrame: { x: 0, y: 0, width: 1, height: 1 },
      translation: { x: 0.5, y: 0.5 },
      scale: 1,
      rotationDegrees: 0,
      flipHorizontal: false,
      flipVertical: false,
      aspectRatio: null
    });
  }

  public static fromPrimitives(input: ViewportTransformPrimitives): ViewportTransform {
    const origin = new NormalizedPoint(
      new NormalizedCoordinate(input.cropFrame.x),
      new NormalizedCoordinate(input.cropFrame.y)
    );
    return new ViewportTransform(
      new NormalizedRectangle(
        origin,
        new NormalizedCoordinate(input.cropFrame.width),
        new NormalizedCoordinate(input.cropFrame.height)
      ),
      new NormalizedPoint(
        new NormalizedCoordinate(input.translation.x),
        new NormalizedCoordinate(input.translation.y)
      ),
      input.scale,
      input.rotationDegrees,
      input.flipHorizontal,
      input.flipVertical,
      input.aspectRatio === null ? null : new AspectRatio(input.aspectRatio.width, input.aspectRatio.height)
    );
  }

  public toPrimitives(): ViewportTransformPrimitives {
    const origin = this.cropFrame.getOrigin();
    return {
      cropFrame: {
        x: origin.getX().valueOf(),
        y: origin.getY().valueOf(),
        width: this.cropFrame.getWidth().valueOf(),
        height: this.cropFrame.getHeight().valueOf()
      },
      translation: {
        x: this.translation.getX().valueOf(),
        y: this.translation.getY().valueOf()
      },
      scale: this.scale,
      rotationDegrees: this.rotationDegrees,
      flipHorizontal: this.flipHorizontal,
      flipVertical: this.flipVertical,
      aspectRatio:
        this.aspectRatio === null
          ? null
          : { width: this.aspectRatio.getWidth(), height: this.aspectRatio.getHeight() }
    };
  }
}
