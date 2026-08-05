export class AiConfigurationRequiredError extends Error {
  public readonly code = 'AI_CONFIGURATION_REQUIRED';

  public constructor() {
    super('Configure an AI provider before using AI Companion.');
    this.name = 'AiConfigurationRequiredError';
  }

  public static matches(error: unknown): error is AiConfigurationRequiredError {
    return error instanceof AiConfigurationRequiredError
      || (error instanceof Error && 'code' in error && error.code === 'AI_CONFIGURATION_REQUIRED');
  }
}
