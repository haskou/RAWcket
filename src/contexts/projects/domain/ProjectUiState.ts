import { Enum } from '@haskou/value-objects';

const interfaceModes = ['simple', 'advanced'] as const;
export type InterfaceModePrimitive = (typeof interfaceModes)[number];

export class InterfaceMode extends Enum<InterfaceModePrimitive> {
  public static readonly SIMPLE = new InterfaceMode('simple');
  public static readonly ADVANCED = new InterfaceMode('advanced');
  private constructor(value: InterfaceModePrimitive) {
    super(value);
  }
  public static fromPrimitives(value: InterfaceModePrimitive): InterfaceMode {
    return new InterfaceMode(value);
  }
  public getValues(): InterfaceModePrimitive[] {
    return [...interfaceModes];
  }
  public isAdvanced(): boolean {
    return this.isEqual(InterfaceMode.ADVANCED);
  }
}

export class ProjectUiState {
  public constructor(private mode: InterfaceMode) {}
  public chooseMode(mode: InterfaceMode): void {
    this.mode = mode;
  }
  public getMode(): InterfaceMode {
    return this.mode;
  }
}
