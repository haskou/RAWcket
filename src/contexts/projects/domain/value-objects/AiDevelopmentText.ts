import { StringValueObject } from '@haskou/value-objects';

export class AiDevelopmentRequest extends StringValueObject {
  private static readonly MAX_LENGTH = 2_000;

  public constructor(value: string | StringValueObject) {
    super(typeof value === 'string' ? value.trim() : value, AiDevelopmentRequest.MAX_LENGTH);
  }
}

export class AiDevelopmentIntent extends StringValueObject {
  private static readonly MAX_LENGTH = 500;

  public constructor(value: string | StringValueObject) {
    super(typeof value === 'string' ? value.trim() : value, AiDevelopmentIntent.MAX_LENGTH);
    if (this.isEmpty()) throw new Error('AI development intent cannot be empty.');
  }
}

export class AiDevelopmentNarrative extends StringValueObject {
  private static readonly MAX_LENGTH = 1_200;

  public constructor(value: string | StringValueObject) {
    super(typeof value === 'string' ? value.trim() : value, AiDevelopmentNarrative.MAX_LENGTH);
    if (this.isEmpty()) throw new Error('AI development narrative cannot be empty.');
  }
}

export class AiDevelopmentObservation extends StringValueObject {
  private static readonly MAX_LENGTH = 240;

  public constructor(value: string | StringValueObject) {
    super(typeof value === 'string' ? value.trim() : value, AiDevelopmentObservation.MAX_LENGTH);
    if (this.isEmpty()) throw new Error('AI development observation cannot be empty.');
  }
}
