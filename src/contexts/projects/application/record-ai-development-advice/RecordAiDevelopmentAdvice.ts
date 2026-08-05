import { Timestamp } from '@haskou/value-objects';
import type { PhotoProject } from '../../domain/PhotoProject';
import type { RecordAiDevelopmentAdviceMessage } from './messages/RecordAiDevelopmentAdviceMessage';

export class RecordAiDevelopmentAdvice {
  public record(project: PhotoProject, message: RecordAiDevelopmentAdviceMessage): PhotoProject {
    if (!project.isIdentifiedBy(message.getProjectId())) throw new Error('The AI development advice belongs to a different project.');
    const advice = message.getAdvice();
    project.recordAiDevelopmentAdvice(advice, Timestamp.new(message.getOccurredAt()));
    return project;
  }
}
