import type { EditingAdvisor, EditingContext, EditProposal } from '../../application/ports/EditingAdvisor';
import type { OpenAiResponsesClient } from '@/contexts/ai/infrastructure/openai/OpenAiResponsesClient';
import { parseAiStructuredResult } from '@/contexts/ai/infrastructure/validation/parseAiStructuredResult';
import { openAiEditProposalJsonSchema, openAiEditProposalSchema } from './OpenAiEditProposalContract';
import type { OpenAiEditProposalMapper } from './OpenAiEditProposalMapper';

export class OpenAiEditingAdvisor implements EditingAdvisor {
  public constructor(
    private readonly client: OpenAiResponsesClient,
    private readonly mapper: OpenAiEditProposalMapper
  ) {}

  public async propose(context: EditingContext): Promise<EditProposal> {
    const result = parseAiStructuredResult(openAiEditProposalSchema, await this.client.reason({
      schemaName: 'rawcket_edit_proposal',
      schema: openAiEditProposalJsonSchema,
      images: [{ label: 'current-render', preview: context.preview }],
      instructions: [
        'You are RAWcket AI Companion, a precise photographic editing advisor.',
        `The photographer wants: ${context.intent}`,
        `Project: ${context.projectName}. Current adjustment values: ${JSON.stringify(context.currentAdjustments)}.`,
        `Current tone curves: ${JSON.stringify(context.currentCurves)}. Current crop and geometry: ${JSON.stringify(context.currentViewport)}. Existing local masks: ${context.existingMaskCount}.`,
        'Judge the visible photograph, preserve believable color and texture, and propose any combination of global adjustments, monotonic-cubic tone curves, crop and geometry, radial masks, linear gradient masks, and luminance-range masks that materially supports the intent.',
        'Return absolute slider values, not deltas. Exposure must be between -5 and 5. Sharpness and noiseReduction must be between 0 and 100; every other value must be between -100 and 100.',
        'Curve points use normalized x/y coordinates, must start at (0,0), end at (1,1), and have strictly increasing unique x values. Keep curves purposeful and normally use 3–6 points.',
        'Crop, mask, and point coordinates are normalized to the visible image: top-left is (0,0), bottom-right is (1,1). Crop width and height must remain inside the image. Use masks only when a local edit is visually justified.',
        'Do not claim that edits were applied. Explain the visual reasoning so every proposed value remains reviewable.'
      ].join('\n')
    }), 'an editing proposal');
    return {
      explanation: result.explanation,
      operations: this.mapper.map(result)
    };
  }
}
