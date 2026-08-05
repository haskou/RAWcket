import type { AiCredentialVault } from '@/contexts/ai/application/ports/AiCredentialVault';
import { AiModel } from '@/contexts/ai/domain/AiModel';
import { AiProvider } from '@/contexts/ai/domain/AiProvider';
import type { BrowserAiImageEncoder } from '@/contexts/ai/infrastructure/openai/BrowserAiImageEncoder';
import { OpenAiResponsesClient } from '@/contexts/ai/infrastructure/openai/OpenAiResponsesClient';

describe('OpenAiResponsesClient', () => {
  it('uses the user-selected model, disables storage, sends encoded previews, and requests strict JSON', async () => {
    const vault = credentialVault('sk-private-test-key', 'user-selected-model');
    const encoder = { encode: vi.fn().mockResolvedValue('data:image/jpeg;base64,cHJldmlldw==') } as unknown as BrowserAiImageEncoder;
    const fetchRequest = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      output: [{ content: [{ type: 'output_text', text: '{"answer":"visible"}' }] }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const client = new OpenAiResponsesClient(vault, encoder, fetchRequest);

    await expect(client.reason({ schemaName: 'test_result', schema: { type: 'object' }, instructions: 'Inspect it', images: [{ label: 'frame-1', preview: new Blob(['preview']) }] })).resolves.toEqual({ answer: 'visible' });
    const request = fetchRequest.mock.calls[0]?.[1];
    if (typeof request?.body !== 'string') throw new Error('Expected a JSON request body.');
    const body = JSON.parse(request.body) as { model: string; store: boolean; text: { format: { strict: boolean } }; input: unknown };
    expect(body).toMatchObject({ model: 'user-selected-model', store: false, text: { format: { strict: true } } });
    expect(request.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer sk-private-test-key' }));
  });

  it('does not expose the API key when OpenAI rejects a request', async () => {
    const client = new OpenAiResponsesClient(
      credentialVault('sk-secret-must-not-leak', 'model'),
      { encode: vi.fn().mockResolvedValue('data:image/jpeg;base64,eA==') } as unknown as BrowserAiImageEncoder,
      vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 401 }))
    );
    await expect(client.reason({ schemaName: 'test', schema: {}, instructions: 'Inspect', images: [] })).rejects.not.toThrow(/sk-secret-must-not-leak/);
  });
});

function credentialVault(apiKey: string, model: string): AiCredentialVault {
  return {
    rememberForSession: vi.fn(), saveEncrypted: vi.fn(), unlock: vi.fn(), getEncryptedSummary: vi.fn(), remove: vi.fn(),
    getSessionCredential: () => ({ provider: AiProvider.OPENAI, model: new AiModel(model), apiKey })
  };
}
