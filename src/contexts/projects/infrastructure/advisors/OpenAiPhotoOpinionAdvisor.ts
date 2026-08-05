import { z } from 'zod';
import type { PhotoOpinion, PhotoOpinionAdvisor, PhotoOpinionContext } from '../../application/ports/PhotoOpinionAdvisor';
import type { OpenAiResponsesClient } from '@/contexts/ai/infrastructure/openai/OpenAiResponsesClient';
import { parseAiStructuredResult } from '@/contexts/ai/infrastructure/validation/parseAiStructuredResult';

const opinionSchema = z.object({
  suggestedIntent: z.string().min(3).max(500),
  critique: z.string().min(1).max(1200),
  strengths: z.array(z.string().min(1).max(300)).min(1).max(4),
  opportunities: z.array(z.string().min(1).max(300)).min(1).max(4)
});
const opinionJsonSchema = {
  type: 'object', additionalProperties: false,
  required: ['suggestedIntent', 'critique', 'strengths', 'opportunities'],
  properties: {
    suggestedIntent: { type: 'string', minLength: 3, maxLength: 500 },
    critique: { type: 'string', minLength: 1, maxLength: 1200 },
    strengths: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', minLength: 1, maxLength: 300 } },
    opportunities: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', minLength: 1, maxLength: 300 } }
  }
};

export class OpenAiPhotoOpinionAdvisor implements PhotoOpinionAdvisor {
  public constructor(private readonly client: OpenAiResponsesClient) {}

  public async review(context: PhotoOpinionContext): Promise<PhotoOpinion> {
    return parseAiStructuredResult(opinionSchema, await this.client.reason({
      schemaName: 'rawcket_photo_opinion', schema: opinionJsonSchema,
      images: [{ label: 'current-render', preview: context.preview }],
      instructions: [
        'Act as a candid but constructive senior photo editor.',
        `Review ${context.projectName}. The rendered histogram reports ${(context.shadowClipping * 100).toFixed(2)}% shadow clipping and ${(context.highlightClipping * 100).toFixed(2)}% highlight clipping.`,
        'Evaluate subject, visual hierarchy, framing options, focus, light, color, mood, and story. Consider what the photograph could become after a careful edit and crop.',
        'Write suggestedIntent as a concrete editing brief of at most 500 characters that can directly drive RAWcket sliders. Keep critique under 1200 characters and each strength or opportunity under 300 characters. Do not describe tools RAWcket does not have.'
      ].join('\n')
    }), 'a photographic opinion');
  }
}
