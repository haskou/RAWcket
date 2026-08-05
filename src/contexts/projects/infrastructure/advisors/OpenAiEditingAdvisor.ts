import { z } from 'zod';
import type { EditingAdvisor, EditingContext, EditProposal } from '../../application/ports/EditingAdvisor';
import { EDIT_OPERATION } from '../../domain/EditOperation';
import { AdjustmentKey } from '../../domain/value-objects/AdjustmentKey';
import { GlobalAdjustmentValue } from '../../domain/value-objects/GlobalAdjustmentValue';
import type { OpenAiResponsesClient } from '@/contexts/ai/infrastructure/openai/OpenAiResponsesClient';
import { parseAiStructuredResult } from '@/contexts/ai/infrastructure/validation/parseAiStructuredResult';

const adjustmentKeys = ['exposure', 'temperature', 'tint', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'saturation', 'vibrance', 'clarity', 'texture', 'dehaze', 'sharpness', 'noiseReduction', 'vignette'] as const;
const proposalSchema = z.object({
  explanation: z.string().min(1).max(1200),
  operations: z.array(z.object({ key: z.enum(adjustmentKeys), value: z.number().min(-100).max(100) })).min(1).max(16)
});

const proposalJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['explanation', 'operations'],
  properties: {
    explanation: { type: 'string', minLength: 1, maxLength: 1200 },
    operations: {
      type: 'array', minItems: 1, maxItems: 16,
      items: {
        type: 'object', additionalProperties: false, required: ['key', 'value'],
        properties: { key: { type: 'string', enum: [...adjustmentKeys] }, value: { type: 'number', minimum: -100, maximum: 100 } }
      }
    }
  }
};

export class OpenAiEditingAdvisor implements EditingAdvisor {
  public constructor(private readonly client: OpenAiResponsesClient) {}

  public async propose(context: EditingContext): Promise<EditProposal> {
    const result = parseAiStructuredResult(proposalSchema, await this.client.reason({
      schemaName: 'rawcket_edit_proposal',
      schema: proposalJsonSchema,
      images: [{ label: 'current-render', preview: context.preview }],
      instructions: [
        'You are RAWcket AI Companion, a precise photographic editing advisor.',
        `The photographer wants: ${context.intent}`,
        `Project: ${context.projectName}. Current adjustment values: ${JSON.stringify(context.currentAdjustments)}.`,
        'Judge the visible photograph, preserve believable color and texture, and propose only changes that materially support the intent.',
        'Return absolute slider values, not deltas. Exposure must be between -5 and 5. Sharpness and noiseReduction must be between 0 and 100; every other value must be between -100 and 100.',
        'Do not claim that edits were applied. Explain the visual reasoning so every proposed value remains reviewable.'
      ].join('\n')
    }), 'an editing proposal');
    if (new Set(result.operations.map((operation) => operation.key)).size !== result.operations.length) {
      throw new Error('OpenAI returned the same adjustment more than once.');
    }
    return {
      explanation: result.explanation,
      operations: result.operations.map((operation) => {
        const key = AdjustmentKey.fromPrimitives(operation.key);
        return {
          kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT,
          key: key.valueOf(),
          value: GlobalAdjustmentValue.clamp(key, operation.value).valueOf(),
          groupId: null
        };
      })
    };
  }
}
