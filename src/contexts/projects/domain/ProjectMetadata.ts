import type { Timestamp } from '@haskou/value-objects';

export class ProjectMetadata {
  public constructor(
    private readonly createdAt: Timestamp,
    private readonly updatedAt: Timestamp,
    private readonly width: number,
    private readonly height: number
  ) {
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
      throw new Error('Las dimensiones de la imagen deben ser enteros positivos.');
    }
  }

  public touch(at: Timestamp): ProjectMetadata {
    return new ProjectMetadata(this.createdAt, at, this.width, this.height);
  }

  public getCreatedAt(): Timestamp {
    return this.createdAt;
  }

  public getUpdatedAt(): Timestamp {
    return this.updatedAt;
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }
}
