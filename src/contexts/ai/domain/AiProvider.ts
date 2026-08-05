import { Enum } from '@haskou/value-objects';

const providers = ['openai'] as const;
export type AiProviderPrimitive = (typeof providers)[number];

export class AiProvider extends Enum<AiProviderPrimitive> {
  public static readonly OPENAI = new AiProvider('openai');

  private constructor(value: AiProviderPrimitive) { super(value); }

  public static fromPrimitives(value: AiProviderPrimitive): AiProvider { return new AiProvider(value); }
  public getValues(): AiProviderPrimitive[] { return [...providers]; }
  public isOpenAi(): boolean { return this.isEqual(AiProvider.OPENAI); }
}
