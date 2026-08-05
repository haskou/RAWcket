import { Enum, Timestamp } from '@haskou/value-objects';
import type { EditOperation } from './EditOperation';
import { AiDevelopmentAdviceId } from './value-objects/AiDevelopmentAdviceId';
import {
  AiDevelopmentIntent,
  AiDevelopmentNarrative,
  AiDevelopmentObservation,
  AiDevelopmentRequest
} from './value-objects/AiDevelopmentText';

const adviceStatuses = ['proposed', 'applied', 'rejected'] as const;
export type AiDevelopmentAdviceStatusPrimitive = (typeof adviceStatuses)[number];

export class AiDevelopmentAdviceStatus extends Enum<AiDevelopmentAdviceStatusPrimitive> {
  public static readonly PROPOSED = new AiDevelopmentAdviceStatus('proposed');
  public static readonly APPLIED = new AiDevelopmentAdviceStatus('applied');
  public static readonly REJECTED = new AiDevelopmentAdviceStatus('rejected');

  private constructor(value: AiDevelopmentAdviceStatusPrimitive) {
    super(value);
  }

  public static fromPrimitives(value: AiDevelopmentAdviceStatusPrimitive): AiDevelopmentAdviceStatus {
    return new AiDevelopmentAdviceStatus(value);
  }

  public getValues(): AiDevelopmentAdviceStatusPrimitive[] {
    return [...adviceStatuses];
  }

  public isProposed(): boolean {
    return this.isEqual(AiDevelopmentAdviceStatus.PROPOSED);
  }
}

export type AiDevelopmentAdvicePrimitives = {
  id: string;
  request: string;
  suggestedIntent: string;
  critique: string;
  strengths: string[];
  opportunities: string[];
  explanation: string;
  operations: EditOperation[];
  createdAt: number;
  status: AiDevelopmentAdviceStatusPrimitive;
};

export class AiDevelopmentAdvice {
  private static readonly MAX_OBSERVATIONS = 8;
  private static readonly MAX_OPERATIONS = 64;

  public constructor(
    private readonly id: AiDevelopmentAdviceId,
    private readonly request: AiDevelopmentRequest,
    private readonly suggestedIntent: AiDevelopmentIntent,
    private readonly critique: AiDevelopmentNarrative,
    private readonly strengths: readonly AiDevelopmentObservation[],
    private readonly opportunities: readonly AiDevelopmentObservation[],
    private readonly explanation: AiDevelopmentNarrative,
    private readonly operations: readonly EditOperation[],
    private readonly createdAt: Timestamp,
    private status: AiDevelopmentAdviceStatus
  ) {
    if (strengths.length > AiDevelopmentAdvice.MAX_OBSERVATIONS || opportunities.length > AiDevelopmentAdvice.MAX_OBSERVATIONS) {
      throw new Error(`AI development advice accepts at most ${AiDevelopmentAdvice.MAX_OBSERVATIONS} strengths and opportunities.`);
    }
    if (operations.length < 1 || operations.length > AiDevelopmentAdvice.MAX_OPERATIONS) {
      throw new Error(`AI development advice requires between 1 and ${AiDevelopmentAdvice.MAX_OPERATIONS} operations.`);
    }
  }

  public static fromPrimitives(input: AiDevelopmentAdvicePrimitives): AiDevelopmentAdvice {
    return new AiDevelopmentAdvice(
      new AiDevelopmentAdviceId(input.id),
      new AiDevelopmentRequest(input.request),
      new AiDevelopmentIntent(input.suggestedIntent),
      new AiDevelopmentNarrative(input.critique),
      input.strengths.map((value) => new AiDevelopmentObservation(value)),
      input.opportunities.map((value) => new AiDevelopmentObservation(value)),
      new AiDevelopmentNarrative(input.explanation),
      structuredClone(input.operations),
      Timestamp.new(input.createdAt),
      AiDevelopmentAdviceStatus.fromPrimitives(input.status)
    );
  }

  public isIdentifiedBy(id: AiDevelopmentAdviceId): boolean {
    return this.id.isEqual(id);
  }

  public getId(): AiDevelopmentAdviceId {
    return this.id;
  }

  public isProposed(): boolean {
    return this.status.isProposed();
  }

  public decide(status: AiDevelopmentAdviceStatus): void {
    if (!this.status.isProposed()) throw new Error('A decided AI development proposal cannot be decided again.');
    if (status.isProposed()) throw new Error('An AI development proposal decision must be applied or rejected.');
    this.status = status;
  }

  public toPrimitives(): AiDevelopmentAdvicePrimitives {
    return {
      id: this.id.valueOf(),
      request: this.request.valueOf(),
      suggestedIntent: this.suggestedIntent.valueOf(),
      critique: this.critique.valueOf(),
      strengths: this.strengths.map((value) => value.valueOf()),
      opportunities: this.opportunities.map((value) => value.valueOf()),
      explanation: this.explanation.valueOf(),
      operations: this.operations.map((operation) => structuredClone(operation)),
      createdAt: this.createdAt.toMilliseconds(),
      status: this.status.valueOf()
    };
  }
}

export type AiDevelopmentJournalPrimitives = { advice: AiDevelopmentAdvicePrimitives[] };

export class AiDevelopmentJournal {
  private static readonly LIMIT = 50;

  public constructor(private advice: AiDevelopmentAdvice[]) {
    if (advice.length > AiDevelopmentJournal.LIMIT) throw new Error(`AI development history is limited to ${AiDevelopmentJournal.LIMIT} entries.`);
  }

  public static empty(): AiDevelopmentJournal {
    return new AiDevelopmentJournal([]);
  }

  public static fromPrimitives(input: AiDevelopmentJournalPrimitives): AiDevelopmentJournal {
    return new AiDevelopmentJournal(input.advice.map((entry) => AiDevelopmentAdvice.fromPrimitives(entry)));
  }

  public record(entry: AiDevelopmentAdvice): void {
    if (this.advice.some((candidate) => candidate.isIdentifiedBy(entry.getId()))) {
      throw new Error('AI development advice has already been recorded.');
    }
    this.advice = [...this.advice, entry].slice(-AiDevelopmentJournal.LIMIT);
  }

  public decide(id: AiDevelopmentAdviceId, status: AiDevelopmentAdviceStatus): void {
    const entry = this.advice.find((candidate) => candidate.isIdentifiedBy(id));
    if (entry === undefined) throw new Error('AI development advice does not exist in this project.');
    entry.decide(status);
  }

  public toPrimitives(): AiDevelopmentJournalPrimitives {
    return { advice: this.advice.map((entry) => entry.toPrimitives()) };
  }
}
