import { z } from 'zod';
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
  output: z.array(z.object({
    content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()).optional()
  }).passthrough())
}).passthrough();

export class OpenAiResponsesClient {
  private static readonly ENDPOINT = 'https://api.openai.com/v1/responses';

  public constructor(
    private readonly vault: AiCredentialVault,
    private readonly imageEncoder: BrowserAiImageEncoder,
    private readonly fetchRequest: typeof fetch = (input, init) => fetch(input, init)
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

    const response = await this.fetchRequest(OpenAiResponsesClient.ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credential.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
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
      })
    });
    if (!response.ok) throw new Error(`OpenAI could not complete the request (HTTP ${response.status}). Check the API key, model, and account access.`);

    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error('OpenAI returned an unexpected response envelope.');
    const outputText = parsed.data.output.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text;
    if (outputText === undefined) throw new Error('OpenAI returned no structured result.');
    try {
      return JSON.parse(outputText) as unknown;
    } catch {
      throw new Error('OpenAI returned invalid structured JSON.');
    }
  }
}
