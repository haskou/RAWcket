import { Enum } from '@haskou/value-objects';

const maskCompositionOperations = ['add', 'subtract', 'intersect'] as const;

export type MaskCompositionOperationPrimitive = (typeof maskCompositionOperations)[number];

export class MaskCompositionOperation extends Enum<MaskCompositionOperationPrimitive> {
  public static readonly ADD = new MaskCompositionOperation('add');
  public static readonly SUBTRACT = new MaskCompositionOperation('subtract');
  public static readonly INTERSECT = new MaskCompositionOperation('intersect');

  private constructor(value: MaskCompositionOperationPrimitive) {
    super(value);
  }

  public static fromPrimitives(value: MaskCompositionOperationPrimitive): MaskCompositionOperation {
    return new MaskCompositionOperation(value);
  }

  public getValues(): MaskCompositionOperationPrimitive[] {
    return [...maskCompositionOperations];
  }

  public isAdd(): boolean {
    return this.isEqual(MaskCompositionOperation.ADD);
  }

  public isSubtract(): boolean {
    return this.isEqual(MaskCompositionOperation.SUBTRACT);
  }
}
