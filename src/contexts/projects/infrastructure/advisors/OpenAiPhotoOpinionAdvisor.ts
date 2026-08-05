import { z } from 'zod';
import type { PhotoOpinion, PhotoOpinionAdvisor, PhotoOpinionContext } from '../../application/ports/PhotoOpinionAdvisor';
import type { OpenAiResponsesClient } from '@/contexts/ai/infrastructure/openai/OpenAiResponsesClient';

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
    suggestedIntent: { type: 'string' }, critique: { type: 'string' },
    strengths: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string' } },
    opportunities: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string' } }
  }
};

export class OpenAiPhotoOpinionAdvisor implements PhotoOpinionAdvisor {
  public constructor(private readonly client: OpenAiResponsesClient) {}

  public async review(context: PhotoOpinionContext): Promise<PhotoOpinion> {
    return opinionSchema.parse(await this.client.reason({
      schemaName: 'rawcket_photo_opinion', schema: opinionJsonSchema,
      images: [{ label: 'current-render', preview: context.preview }],
      instructions: [
        'Act as a candid but constructive senior photo editor.',
        `Review ${context.projectName}. The rendered histogram reports ${(context.shadowClipping * 100).toFixed(2)}% shadow clipping and ${(context.highlightClipping * 100).toFixed(2)}% highlight clipping.`,
        'Evaluate subject, visual hierarchy, framing options, focus, light, color, mood, and story. Consider what the photograph could become after a careful edit and crop.',
        'Write suggestedIntent as a concrete editing brief that can directly drive RAWcket sliders. Do not describe tools RAWcket does not have.'
      ].join('\n')
    }));
  }
}
