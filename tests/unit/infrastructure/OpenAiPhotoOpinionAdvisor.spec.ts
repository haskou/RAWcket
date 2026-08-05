import type { OpenAiResponsesClient, OpenAiStructuredRequest } from '@/contexts/ai/infrastructure/openai/OpenAiResponsesClient';
import { OpenAiPhotoOpinionAdvisor } from '@/contexts/projects/infrastructure/advisors/OpenAiPhotoOpinionAdvisor';

describe('OpenAiPhotoOpinionAdvisor', () => {
  it('publishes the same text limits enforced after the response', async () => {
    const reason = vi.fn<(request: OpenAiStructuredRequest) => Promise<unknown>>().mockResolvedValue({
      suggestedIntent: 'Keep the subject natural and shape the window light.',
      critique: 'The expression is strong; a tighter crop can improve the hierarchy.',
      strengths: ['Clear expression'], opportunities: ['Control the window']
    });
    const advisor = new OpenAiPhotoOpinionAdvisor({ reason } as unknown as OpenAiResponsesClient);

    await advisor.review({ projectName: 'Portrait', preview: new Blob(['preview']), shadowClipping: 0, highlightClipping: 0.02 });

    const schema = reason.mock.calls[0]?.[0].schema as { properties?: { suggestedIntent?: { maxLength?: number }; critique?: { maxLength?: number } } };
    expect(schema.properties?.suggestedIntent?.maxLength).toBe(500);
    expect(schema.properties?.critique?.maxLength).toBe(1200);
  });

  it('returns a readable error instead of exposing Zod diagnostics', async () => {
    const reason = vi.fn<(request: OpenAiStructuredRequest) => Promise<unknown>>().mockResolvedValue({
      suggestedIntent: 'x'.repeat(501), critique: 'y'.repeat(1201), strengths: ['Clear expression'], opportunities: ['Control the window']
    });
    const advisor = new OpenAiPhotoOpinionAdvisor({ reason } as unknown as OpenAiResponsesClient);

    const result = advisor.review({ projectName: 'Portrait', preview: new Blob(['preview']), shadowClipping: 0, highlightClipping: 0 });
    await expect(result).rejects.toThrow(/^OpenAI returned a photographic opinion outside RAWcket’s validated limits/);
  });
});
