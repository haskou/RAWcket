import { InterfaceMode, type InterfaceModePrimitive } from '../../../domain/ProjectUiState';

export class ChooseInterfaceModeMessage {
  private readonly mode: InterfaceMode;
  public constructor(mode: InterfaceModePrimitive) {
    this.mode = InterfaceMode.fromPrimitives(mode);
  }
  public getMode(): InterfaceMode {
    return this.mode;
  }
}
