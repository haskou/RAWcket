export class CalibrateRawDisplayMessage {
  public constructor(
    private readonly raw: Blob,
    private readonly cameraReference: Blob
  ) {
    if (raw.type !== 'image/x-sony-arw') throw new Error('RAW display calibration requires a Sony ARW original.');
    if (cameraReference.type !== 'image/jpeg') throw new Error('RAW display calibration requires the matching camera JPEG.');
  }

  public getRaw(): Blob {
    return this.raw;
  }

  public getCameraReference(): Blob {
    return this.cameraReference;
  }
}
