import { Timestamp } from '@haskou/value-objects';
import type { PhotoProject } from '../../domain/PhotoProject';
import type { ChangeHistoryMessage } from './messages/ChangeHistoryMessage';

export class ChangeHistory {
  public undo(project: PhotoProject, message: ChangeHistoryMessage): PhotoProject {
    this.ensureProject(project, message);
    project.undo(Timestamp.new(message.getOccurredAt()));
    return project;
  }

  public redo(project: PhotoProject, message: ChangeHistoryMessage): PhotoProject {
    this.ensureProject(project, message);
    project.redo(Timestamp.new(message.getOccurredAt()));
    return project;
  }

  private ensureProject(project: PhotoProject, message: ChangeHistoryMessage): void {
    if (!project.isIdentifiedBy(message.getProjectId())) throw new Error('The history request belongs to a different project.');
  }
}
