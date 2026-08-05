import { Timestamp } from '@haskou/value-objects';
import { AiDevelopmentAdvice, AiDevelopmentAdviceStatus } from '../../../domain/AiDevelopmentJournal';
import type { EditOperation } from '../../../domain/EditOperation';
import { AiDevelopmentAdviceId } from '../../../domain/value-objects/AiDevelopmentAdviceId';
import {
  AiDevelopmentIntent,
  AiDevelopmentNarrative,
  AiDevelopmentObservation,
  AiDevelopmentRequest
} from '../../../domain/value-objects/AiDevelopmentText';
import { ProjectId } from '../../../domain/value-objects/ProjectId';

export class RecordAiDevelopmentAdviceMessage {
  private readonly projectId: ProjectId;
  private readonly advice: AiDevelopmentAdvice;

  public constructor(
    projectId: string,
    adviceId: string,
    request: string,
    suggestedIntent: string,
    critique: string,
    strengths: string[],
    opportunities: string[],
    explanation: string,
    operations: EditOperation[],
    private readonly occurredAt = Date.now()
  ) {
    this.projectId = new ProjectId(projectId);
    this.advice = new AiDevelopmentAdvice(
      new AiDevelopmentAdviceId(adviceId),
      new AiDevelopmentRequest(request),
      new AiDevelopmentIntent(suggestedIntent),
      new AiDevelopmentNarrative(critique),
      strengths.map((value) => new AiDevelopmentObservation(value)),
      opportunities.map((value) => new AiDevelopmentObservation(value)),
      new AiDevelopmentNarrative(explanation),
      structuredClone(operations),
      Timestamp.new(occurredAt),
      AiDevelopmentAdviceStatus.PROPOSED
    );
  }

  public getProjectId(): ProjectId {
    return this.projectId;
  }

  public getAdvice(): AiDevelopmentAdvice {
    return this.advice;
  }

  public getOccurredAt(): number {
    return this.occurredAt;
  }
}
