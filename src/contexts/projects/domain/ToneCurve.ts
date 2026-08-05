import { Enum, NumberValueObject } from '@haskou/value-objects';

const curveChannels = ['rgb', 'red', 'green', 'blue', 'luminance'] as const;
const interpolationKinds = ['linear', 'monotonic-cubic'] as const;
export type CurveChannelPrimitive = (typeof curveChannels)[number];
export type CurveInterpolationPrimitive = (typeof interpolationKinds)[number];

export class CurveChannel extends Enum<CurveChannelPrimitive> {
  public static readonly RGB = new CurveChannel('rgb');
  public static readonly RED = new CurveChannel('red');
  public static readonly GREEN = new CurveChannel('green');
  public static readonly BLUE = new CurveChannel('blue');
  public static readonly LUMINANCE = new CurveChannel('luminance');
  private constructor(value: CurveChannelPrimitive) {
    super(value);
  }
  public static fromPrimitives(value: CurveChannelPrimitive): CurveChannel {
    return new CurveChannel(value);
  }
  public getValues(): CurveChannelPrimitive[] {
    return [...curveChannels];
  }
  public isRgb(): boolean { return this.isEqual(CurveChannel.RGB); }
  public isRed(): boolean { return this.isEqual(CurveChannel.RED); }
  public isGreen(): boolean { return this.isEqual(CurveChannel.GREEN); }
  public isBlue(): boolean { return this.isEqual(CurveChannel.BLUE); }
  public isLuminance(): boolean { return this.isEqual(CurveChannel.LUMINANCE); }
}

export class CurveInterpolation extends Enum<CurveInterpolationPrimitive> {
  private constructor(value: CurveInterpolationPrimitive) {
    super(value);
  }
  public static fromPrimitives(value: CurveInterpolationPrimitive): CurveInterpolation {
    return new CurveInterpolation(value);
  }
  public getValues(): CurveInterpolationPrimitive[] {
    return [...interpolationKinds];
  }
}

export class CurveCoordinate extends NumberValueObject {
  public constructor(value: number) {
    super(value);
    if (this.isLessThan(0) || this.isGreaterThan(1)) {
      throw new Error('Curve points must be between 0 and 1.');
    }
  }
}

export class CurvePoint {
  public constructor(
    private readonly x: CurveCoordinate,
    private readonly y: CurveCoordinate
  ) {}
  public getX(): CurveCoordinate {
    return this.x;
  }
  public getY(): CurveCoordinate {
    return this.y;
  }
}

export type ToneCurvePrimitives = {
  points: Array<{ x: number; y: number }>;
  interpolation: CurveInterpolationPrimitive;
};

export class ToneCurve {
  private static readonly MAX_POINTS = 64;

  public constructor(
    private readonly points: readonly CurvePoint[],
    private readonly interpolation: CurveInterpolation
  ) {
    if (points.length < 2 || points.length > ToneCurve.MAX_POINTS) {
      throw new Error(`A curve must contain between 2 and ${ToneCurve.MAX_POINTS} points.`);
    }
    if (!points[0]?.getX().isZero() || !points.at(-1)?.getX().isEqual(new CurveCoordinate(1))) {
      throw new Error('A curve must start at x=0 and end at x=1.');
    }
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      if (previous === undefined || !current?.getX().isGreaterThan(previous.getX())) {
        throw new Error('Curve points must have increasing, unique x coordinates.');
      }
    }
  }

  public static identity(): ToneCurve {
    return ToneCurve.fromPrimitives({
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 }
      ],
      interpolation: 'monotonic-cubic'
    });
  }

  public static fromPrimitives(input: ToneCurvePrimitives): ToneCurve {
    return new ToneCurve(
      input.points.map((point) => new CurvePoint(new CurveCoordinate(point.x), new CurveCoordinate(point.y))),
      CurveInterpolation.fromPrimitives(input.interpolation)
    );
  }

  public toPrimitives(): ToneCurvePrimitives {
    return {
      points: this.points.map((point) => ({ x: point.getX().valueOf(), y: point.getY().valueOf() })),
      interpolation: this.interpolation.valueOf()
    };
  }

  public isIdentity(): boolean {
    const first = this.points[0];
    const last = this.points[1];
    return this.points.length === 2
      && first !== undefined
      && last !== undefined
      && first.getX().isZero()
      && first.getY().isZero()
      && last.getX().isEqual(new CurveCoordinate(1))
      && last.getY().isEqual(new CurveCoordinate(1));
  }
}

export type CurveSetPrimitives = Record<'rgb' | 'red' | 'green' | 'blue', ToneCurvePrimitives> & {
  luminance: ToneCurvePrimitives | null;
};

export class CurveSet {
  public constructor(
    private readonly rgb: ToneCurve,
    private readonly red: ToneCurve,
    private readonly green: ToneCurve,
    private readonly blue: ToneCurve,
    private readonly luminance: ToneCurve | null
  ) {}

  public static identity(): CurveSet {
    return new CurveSet(ToneCurve.identity(), ToneCurve.identity(), ToneCurve.identity(), ToneCurve.identity(), null);
  }

  public static fromPrimitives(input: CurveSetPrimitives): CurveSet {
    return new CurveSet(
      ToneCurve.fromPrimitives(input.rgb),
      ToneCurve.fromPrimitives(input.red),
      ToneCurve.fromPrimitives(input.green),
      ToneCurve.fromPrimitives(input.blue),
      input.luminance === null ? null : ToneCurve.fromPrimitives(input.luminance)
    );
  }

  public replace(channel: CurveChannel, curve: ToneCurve | null): CurveSet {
    if (curve === null && !channel.isLuminance()) {
      throw new Error('Only the luminance curve may be omitted.');
    }
    return new CurveSet(
      channel.isRgb() && curve !== null ? curve : this.rgb,
      channel.isRed() && curve !== null ? curve : this.red,
      channel.isGreen() && curve !== null ? curve : this.green,
      channel.isBlue() && curve !== null ? curve : this.blue,
      channel.isLuminance() ? curve : this.luminance
    );
  }

  public get(channel: CurveChannel): ToneCurve | null {
    if (channel.isRgb()) return this.rgb;
    if (channel.isRed()) return this.red;
    if (channel.isGreen()) return this.green;
    if (channel.isBlue()) return this.blue;
    return this.luminance;
  }

  public hasAdjustments(): boolean {
    return !this.rgb.isIdentity()
      || !this.red.isIdentity()
      || !this.green.isIdentity()
      || !this.blue.isIdentity()
      || (this.luminance !== null && !this.luminance.isIdentity());
  }

  public toPrimitives(): CurveSetPrimitives {
    return {
      rgb: this.rgb.toPrimitives(),
      red: this.red.toPrimitives(),
      green: this.green.toPrimitives(),
      blue: this.blue.toPrimitives(),
      luminance: this.luminance?.toPrimitives() ?? null
    };
  }
}
