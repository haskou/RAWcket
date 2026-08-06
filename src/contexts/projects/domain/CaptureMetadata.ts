import { Enum, Integer, NumberValueObject, PositiveNumber, StringValueObject } from '@haskou/value-objects';

const whiteBalanceModes = ['auto', 'manual'] as const;
const captureColorSpaces = ['srgb', 'adobe-rgb', 'uncalibrated'] as const;
export type WhiteBalanceModePrimitive = (typeof whiteBalanceModes)[number];
export type CaptureColorSpacePrimitive = (typeof captureColorSpaces)[number];

export type CaptureMetadataPrimitives = {
  cameraMake: string | null;
  cameraModel: string | null;
  lensModel: string | null;
  capturedAt: string | null;
  exposureTimeSeconds: number | null;
  apertureFNumber: number | null;
  iso: number | null;
  focalLengthMm: number | null;
  orientation: number | null;
  whiteBalance: WhiteBalanceModePrimitive | null;
  colorSpace: CaptureColorSpacePrimitive | null;
  blackLevel: number | null;
  whiteLevel: number | null;
  cfaPattern: string | null;
};

export class WhiteBalanceMode extends Enum<WhiteBalanceModePrimitive> {
  private constructor(value: WhiteBalanceModePrimitive) { super(value); }
  public static fromPrimitives(value: WhiteBalanceModePrimitive): WhiteBalanceMode { return new WhiteBalanceMode(value); }
  public getValues(): WhiteBalanceModePrimitive[] { return [...whiteBalanceModes]; }
}

export class CaptureColorSpace extends Enum<CaptureColorSpacePrimitive> {
  private constructor(value: CaptureColorSpacePrimitive) { super(value); }
  public static fromPrimitives(value: CaptureColorSpacePrimitive): CaptureColorSpace { return new CaptureColorSpace(value); }
  public getValues(): CaptureColorSpacePrimitive[] { return [...captureColorSpaces]; }
}

export class ExifOrientation extends Integer {
  public constructor(value: number | Integer) {
    super(value);
    if (this.isLessThan(1) || this.isGreaterThan(8)) throw new Error('EXIF orientation must be between 1 and 8.');
  }
}

export class SensorLevel extends NumberValueObject {
  public constructor(value: number | NumberValueObject) {
    super(value);
    if (this.isLessThan(0)) throw new Error('Sensor levels cannot be negative.');
  }
}

export class CaptureMetadata {
  public constructor(
    private readonly cameraMake: StringValueObject | null,
    private readonly cameraModel: StringValueObject | null,
    private readonly lensModel: StringValueObject | null,
    private readonly capturedAt: StringValueObject | null,
    private readonly exposureTimeSeconds: PositiveNumber | null,
    private readonly apertureFNumber: PositiveNumber | null,
    private readonly iso: PositiveNumber | null,
    private readonly focalLengthMm: PositiveNumber | null,
    private readonly orientation: ExifOrientation | null,
    private readonly whiteBalance: WhiteBalanceMode | null,
    private readonly colorSpace: CaptureColorSpace | null,
    private readonly blackLevel: SensorLevel | null,
    private readonly whiteLevel: SensorLevel | null,
    private readonly cfaPattern: StringValueObject | null
  ) {
    if (blackLevel !== null && whiteLevel !== null && !whiteLevel.isGreaterThan(blackLevel)) {
      throw new Error('The sensor white level must be greater than its black level.');
    }
  }

  public static empty(): CaptureMetadata { return CaptureMetadata.fromPrimitives(emptyCaptureMetadata); }

  public static fromPrimitives(input: CaptureMetadataPrimitives): CaptureMetadata {
    return new CaptureMetadata(
      optionalString(input.cameraMake),
      optionalString(input.cameraModel),
      optionalString(input.lensModel),
      optionalString(input.capturedAt),
      optionalPositiveNumber(input.exposureTimeSeconds),
      optionalPositiveNumber(input.apertureFNumber),
      optionalPositiveNumber(input.iso),
      optionalPositiveNumber(input.focalLengthMm),
      input.orientation === null ? null : new ExifOrientation(input.orientation),
      input.whiteBalance === null ? null : WhiteBalanceMode.fromPrimitives(input.whiteBalance),
      input.colorSpace === null ? null : CaptureColorSpace.fromPrimitives(input.colorSpace),
      input.blackLevel === null ? null : new SensorLevel(input.blackLevel),
      input.whiteLevel === null ? null : new SensorLevel(input.whiteLevel),
      optionalString(input.cfaPattern)
    );
  }

  public isEmpty(): boolean {
    return Object.values(this.toPrimitives()).every((value) => value === null);
  }

  public getOrientation(): ExifOrientation | null {
    return this.orientation === null ? null : new ExifOrientation(this.orientation);
  }

  public toPrimitives(): CaptureMetadataPrimitives {
    return {
      cameraMake: this.cameraMake?.valueOf() ?? null,
      cameraModel: this.cameraModel?.valueOf() ?? null,
      lensModel: this.lensModel?.valueOf() ?? null,
      capturedAt: this.capturedAt?.valueOf() ?? null,
      exposureTimeSeconds: this.exposureTimeSeconds?.valueOf() ?? null,
      apertureFNumber: this.apertureFNumber?.valueOf() ?? null,
      iso: this.iso?.valueOf() ?? null,
      focalLengthMm: this.focalLengthMm?.valueOf() ?? null,
      orientation: this.orientation?.valueOf() ?? null,
      whiteBalance: this.whiteBalance?.valueOf() ?? null,
      colorSpace: this.colorSpace?.valueOf() ?? null,
      blackLevel: this.blackLevel?.valueOf() ?? null,
      whiteLevel: this.whiteLevel?.valueOf() ?? null,
      cfaPattern: this.cfaPattern?.valueOf() ?? null
    };
  }
}

export const emptyCaptureMetadata: CaptureMetadataPrimitives = {
  cameraMake: null,
  cameraModel: null,
  lensModel: null,
  capturedAt: null,
  exposureTimeSeconds: null,
  apertureFNumber: null,
  iso: null,
  focalLengthMm: null,
  orientation: null,
  whiteBalance: null,
  colorSpace: null,
  blackLevel: null,
  whiteLevel: null,
  cfaPattern: null
};

function optionalString(value: string | null): StringValueObject | null {
  if (value === null) return null;
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 160) throw new Error('Capture metadata text must contain between 1 and 160 characters.');
  return new StringValueObject(normalized);
}

function optionalPositiveNumber(value: number | null): PositiveNumber | null {
  return value === null ? null : new PositiveNumber(value);
}
