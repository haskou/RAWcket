import { StringValueObject } from '@haskou/value-objects';

export class AiModel extends StringValueObject {
  public constructor(value: string) {
    super(value.trim());
    if (this.isEmpty() || this.valueOf().length > 100 || !/^[a-zA-Z0-9._:-]+$/.test(this.valueOf())) {
      throw new Error('The AI model must be a valid model identifier of at most 100 characters.');
    }
  }
}
