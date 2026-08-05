import { Timestamp } from '@haskou/value-objects';
import type { PhotoProject } from '../../domain/PhotoProject';
import type { ApplyEditOperationMessage } from './messages/ApplyEditOperationMessage';

export class ApplyEditOperation {
  public apply(project: PhotoProject, message: ApplyEditOperationMessage): PhotoProject {
    if (!project.isIdentifiedBy(message.getProjectId())) throw new Error('The operation belongs to a different project.');
    project.apply(message.getOperation(), Timestamp.new(message.getOccurredAt()));
    return project;
  }
}
