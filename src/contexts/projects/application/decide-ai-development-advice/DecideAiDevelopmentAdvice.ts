import { Timestamp } from '@haskou/value-objects';
import type { PhotoProject } from '../../domain/PhotoProject';
import type { DecideAiDevelopmentAdviceMessage } from './messages/DecideAiDevelopmentAdviceMessage';

export class DecideAiDevelopmentAdvice {
  public decide(project: PhotoProject, message: DecideAiDevelopmentAdviceMessage): PhotoProject {
    if (!project.isIdentifiedBy(message.getProjectId())) throw new Error('The AI development decision belongs to a different project.');
    project.decideAiDevelopmentAdvice(message.getAdviceId(), message.getStatus(), Timestamp.new(message.getOccurredAt()));
    return project;
  }
}
