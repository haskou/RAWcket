import type { PhotoProject } from '../../domain/PhotoProject';
import type { DevelopmentSettingsClipboard } from '../ports/DevelopmentSettingsClipboard';
import type { CopyDevelopmentSettingsMessage } from './messages/CopyDevelopmentSettingsMessage';

export class CopyDevelopmentSettings {
  public constructor(private readonly clipboard: DevelopmentSettingsClipboard) {}

  public copy(project: PhotoProject, message: CopyDevelopmentSettingsMessage): Promise<void> {
    if (!project.isIdentifiedBy(message.getProjectId())) {
      throw new Error('The copied recipe belongs to a different project.');
    }
    return this.clipboard.write(project.getDevelopmentSettings());
  }
}
