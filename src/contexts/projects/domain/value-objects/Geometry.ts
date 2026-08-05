import { NumberValueObject } from '@haskou/value-objects';

export class NormalizedCoordinate extends NumberValueObject {
  public constructor(value: number | NumberValueObject) {
    super(value);
    if (this.isLessThan(0) || this.isGreaterThan(1)) {
      throw new Error('A normalized coordinate must be between 0 and 1.');
    }
  }
}

export class NormalizedPoint {
  public constructor(
    private readonly x: NormalizedCoordinate,
    private readonly y: NormalizedCoordinate
  ) {}

  public getX(): NormalizedCoordinate {
    return this.x;
  }

  public getY(): NormalizedCoordinate {
    return this.y;
  }
}

export class NormalizedRectangle {
  public constructor(
    private readonly origin: NormalizedPoint,
    private readonly width: NormalizedCoordinate,
    private readonly height: NormalizedCoordinate
  ) {
    if (origin.getX().add(width).isGreaterThan(1) || origin.getY().add(height).isGreaterThan(1)) {
      throw new Error('A normalized rectangle must remain inside the canvas.');
    }
    if (width.isZero() || height.isZero()) {
      throw new Error('A crop rectangle must have a positive area.');
    }
  }

  public getOrigin(): NormalizedPoint {
    return this.origin;
  }

  public getWidth(): NormalizedCoordinate {
    return this.width;
  }

  public getHeight(): NormalizedCoordinate {
    return this.height;
  }
}

export class AspectRatio {
  public constructor(
    private readonly width: number,
    private readonly height: number
  ) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error('An aspect ratio must contain positive dimensions.');
    }
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }
}
