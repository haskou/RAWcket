import { Timestamp } from '@haskou/value-objects';
import { EDIT_OPERATION } from '../../domain/EditOperation';
import type { PhotoProject } from '../../domain/PhotoProject';
import type { DevelopmentSettingsClipboard } from '../ports/DevelopmentSettingsClipboard';
import type { PasteDevelopmentSettingsMessage } from './messages/PasteDevelopmentSettingsMessage';

export class PasteDevelopmentSettings {
  public constructor(private readonly clipboard: DevelopmentSettingsClipboard) {}

  public async paste(project: PhotoProject, message: PasteDevelopmentSettingsMessage): Promise<PhotoProject> {
    if (!project.isIdentifiedBy(message.getProjectId())) {
      throw new Error('The pasted recipe belongs to a different project.');
    }
    const settings = await this.clipboard.read();
    project.apply({ kind: EDIT_OPERATION.REPLACE_DEVELOPMENT_SETTINGS, settings, groupId: null }, Timestamp.new(message.getOccurredAt()));
    return project;
  }
}
