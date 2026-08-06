import { z } from 'zod';
import { Flow, TimeoutError } from '@haskou/flow';
import type { AiCredentialVault } from '../../application/ports/AiCredentialVault';
import { AiConfigurationRequiredError } from '../../application/errors/AiConfigurationRequiredError';
import type { BrowserAiImageEncoder } from './BrowserAiImageEncoder';

export type OpenAiStructuredRequest = {
  schemaName: string;
  schema: Record<string, unknown>;
  instructions: string;
  images: Array<{ label: string; preview: Blob }>;
};

const responseSchema = z.object({
  status: z.string().optional(),
  error: z.object({ message: z.string().optional() }).passthrough().nullable().optional(),
  incomplete_details: z.object({ reason: z.string().optional() }).passthrough().nullable().optional(),
  output: z.array(z.object({
    content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()).optional()
  }).passthrough())
}).passthrough();

const errorEnvelopeSchema = z.object({
  error: z.object({ message: z.string().optional() }).passthrough().optional()
}).passthrough();

type OpenAiResponsesClientOptions = {
  timeoutMilliseconds?: number;
  retryDelayMilliseconds?: number;
  maximumAttempts?: number;
};

class OpenAiHttpError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfterMilliseconds: number | null
  ) {
    super(message);
  }
}

class OpenAiIncompleteResponseError extends Error {}

export class OpenAiResponsesClient {
  private static readonly ENDPOINT = 'https://api.openai.com/v1/responses';
  private static readonly DEFAULT_TIMEOUT_MILLISECONDS = 45_000;
  private static readonly DEFAULT_RETRY_DELAY_MILLISECONDS = 750;
  private static readonly DEFAULT_MAXIMUM_ATTEMPTS = 2;

  public constructor(
    private readonly vault: AiCredentialVault,
    private readonly imageEncoder: BrowserAiImageEncoder,
    private readonly fetchRequest: typeof fetch = (input, init) => fetch(input, init),
    private readonly options: OpenAiResponsesClientOptions = {}
  ) {}

  public async reason(request: OpenAiStructuredRequest): Promise<unknown> {
    const credential = this.vault.getSessionCredential();
    if (credential === null) throw new AiConfigurationRequiredError();
    if (!credential.provider.isOpenAi()) throw new Error('The configured AI provider is not supported by this adapter.');

    const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: request.instructions }];
    for (const image of request.images) {
      content.push({ type: 'input_text', text: `Photograph identifier: ${image.label}` });
      content.push({ type: 'input_image', image_url: await this.imageEncoder.encode(image.preview), detail: 'high' });
    }

    const requestBody = JSON.stringify({
      model: credential.model.valueOf(),
      store: false,
      input: [{ role: 'user', content }],
      text: {
        format: {
          type: 'json_schema',
          name: request.schemaName,
          strict: true,
          schema: request.schema
        }
      }
    });
    return this.requestWithRecovery(credential.apiKey, requestBody);
  }

  private async parseCompletedResponse(response: Response): Promise<unknown> {
    let envelope: unknown;
    try {
      envelope = await response.json();
    } catch {
      throw new OpenAiIncompleteResponseError('OpenAI returned an unreadable response.');
    }
    const parsed = responseSchema.safeParse(envelope);
    if (!parsed.success) throw new OpenAiIncompleteResponseError('OpenAI returned an unexpected response envelope.');
    if (parsed.data.status !== undefined && parsed.data.status !== 'completed') {
      const detail = parsed.data.error?.message ?? parsed.data.incomplete_details?.reason ?? parsed.data.status;
      throw new OpenAiIncompleteResponseError(`OpenAI finished without a complete proposal (${detail}).`);
    }
    const outputText = parsed.data.output.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text;
    if (outputText === undefined) throw new OpenAiIncompleteResponseError('OpenAI finished without returning an editable proposal.');
    try {
      return JSON.parse(outputText) as unknown;
    } catch {
      throw new OpenAiIncompleteResponseError('OpenAI returned invalid structured JSON.');
    }
  }

  private async requestWithRecovery(apiKey: string, body: string): Promise<unknown> {
    const maximumAttempts = this.options.maximumAttempts ?? OpenAiResponsesClient.DEFAULT_MAXIMUM_ATTEMPTS;
    for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
      try {
        const response = await new Flow()
          .task((signal) => this.fetchRequest(OpenAiResponsesClient.ENDPOINT, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body,
            signal
          }))
          .timeout(this.options.timeoutMilliseconds ?? OpenAiResponsesClient.DEFAULT_TIMEOUT_MILLISECONDS)
          .run();
        if (response.ok) return await this.parseCompletedResponse(response);
        throw await this.httpError(response);
      } catch (error: unknown) {
        if (attempt >= maximumAttempts || !this.isTransient(error)) throw this.userFacingError(error);
        await this.wait(this.retryDelay(error));
      }
    }
    throw new Error('OpenAI could not complete the proposal.');
  }

  private async httpError(response: Response): Promise<OpenAiHttpError> {
    let apiMessage: string | undefined;
    try {
      const parsed = errorEnvelopeSchema.safeParse(await response.json());
      if (parsed.success) apiMessage = parsed.data.error?.message;
    } catch {
      // Some API and proxy errors intentionally have no JSON body.
    }
    const message = apiMessage === undefined
      ? `OpenAI could not complete the request (HTTP ${response.status}).`
      : `OpenAI could not complete the request (HTTP ${response.status}): ${apiMessage}`;
    return new OpenAiHttpError(response.status, message, this.retryAfter(response.headers.get('Retry-After')));
  }

  private isTransient(error: unknown): boolean {
    if (error instanceof TimeoutError || error instanceof TypeError || error instanceof OpenAiIncompleteResponseError) return true;
    if (error instanceof DOMException && error.name === 'AbortError') return true;
    return error instanceof OpenAiHttpError
      && (error.status === 408 || error.status === 409 || error.status === 422 || error.status === 429 || error.status >= 500);
  }

  private userFacingError(error: unknown): Error {
    if (error instanceof TimeoutError) return new Error('OpenAI took too long twice and the proposal was cancelled. Please try again.');
    if (error instanceof DOMException && error.name === 'AbortError') return new Error('OpenAI took too long twice and the proposal was cancelled. Please try again.');
    if (error instanceof OpenAiIncompleteResponseError) return new Error(`${error.message} RAWcket retried automatically, but no editable recipe was produced.`);
    if (error instanceof OpenAiHttpError) {
      const suffix = error.status === 401 || error.status === 403
        ? ' Check the API key, model, and account access.'
        : ' Please try again.';
      return new Error(`${error.message}${suffix}`);
    }
    if (error instanceof TypeError) return new Error('RAWcket could not reach OpenAI after two attempts. Check the connection and try again.');
    return error instanceof Error ? error : new Error('OpenAI could not complete the proposal.');
  }

  private retryDelay(error: unknown): number {
    if (error instanceof OpenAiHttpError && error.retryAfterMilliseconds !== null) return error.retryAfterMilliseconds;
    return this.options.retryDelayMilliseconds ?? OpenAiResponsesClient.DEFAULT_RETRY_DELAY_MILLISECONDS;
  }

  private retryAfter(value: string | null): number | null {
    if (value === null) return null;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
    const date = Date.parse(value);
    return Number.isFinite(date) ? Math.max(0, date - Date.now()) : null;
  }

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
