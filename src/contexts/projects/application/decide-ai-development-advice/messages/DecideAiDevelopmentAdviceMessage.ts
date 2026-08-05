import { AiDevelopmentAdviceStatus, type AiDevelopmentAdviceStatusPrimitive } from '../../../domain/AiDevelopmentJournal';
import { AiDevelopmentAdviceId } from '../../../domain/value-objects/AiDevelopmentAdviceId';
import { ProjectId } from '../../../domain/value-objects/ProjectId';

export class DecideAiDevelopmentAdviceMessage {
  private readonly projectId: ProjectId;
  private readonly adviceId: AiDevelopmentAdviceId;
  private readonly status: AiDevelopmentAdviceStatus;

  public constructor(
    projectId: string,
    adviceId: string,
    status: Exclude<AiDevelopmentAdviceStatusPrimitive, 'proposed'>,
    private readonly occurredAt = Date.now()
  ) {
    this.projectId = new ProjectId(projectId);
    this.adviceId = new AiDevelopmentAdviceId(adviceId);
    this.status = AiDevelopmentAdviceStatus.fromPrimitives(status);
  }

  public getProjectId(): ProjectId {
    return this.projectId;
  }

  public getAdviceId(): AiDevelopmentAdviceId {
    return this.adviceId;
  }

  public getStatus(): AiDevelopmentAdviceStatus {
    return this.status;
  }

  public getOccurredAt(): number {
    return this.occurredAt;
  }
}
