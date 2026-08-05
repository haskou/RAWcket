import type { PhotoProject } from '../../domain/PhotoProject';
import type { ChooseInterfaceModeMessage } from './messages/ChooseInterfaceModeMessage';

export class ChooseInterfaceMode {
  public choose(project: PhotoProject, message: ChooseInterfaceModeMessage): PhotoProject {
    project.chooseInterfaceMode(message.getMode());
    return project;
  }
}
