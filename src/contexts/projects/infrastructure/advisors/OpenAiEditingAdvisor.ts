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
        context.intent === null
          ? 'The photographer asked for your opinion. Infer a concrete editing intent from the visible photograph.'
          : `The photographer wants: ${context.intent}`,
        `Project: ${context.projectName}. Current adjustment values: ${JSON.stringify(context.currentAdjustments)}.`,
        `Histogram: ${(context.shadowClipping * 100).toFixed(2)}% shadow clipping and ${(context.highlightClipping * 100).toFixed(2)}% highlight clipping.`,
        `Current tone curves: ${JSON.stringify(context.currentCurves)}. Current crop and geometry: ${JSON.stringify(context.currentViewport)}. Existing local masks: ${context.existingMaskCount}.`,
        'Return a candid critique, strengths, opportunities, a concrete suggestedIntent, and a complete editable proposal in this single response.',
        'Judge the visible photograph, preserve believable color and texture, and propose any combination of global adjustments, monotonic-cubic tone curves, crop and geometry, radial masks, linear gradient masks, luminance-range masks, and point-guided smart masks that materially supports the intent.',
        'Always evaluate whether a tighter crop, rotation, or perspective correction improves hierarchy. Include a viewport operation when it does; do not omit crop merely because it is structurally more complex than a slider.',
        'Use smart-mask only for a visually identifiable subject or region. Supply normalized positive/negative points and optional bounding boxes; the resulting local spatial-luminance segmentation remains editable in RAWcket.',
        'Return absolute slider values, not deltas. Exposure must be between -5 and 5. Sharpness and noiseReduction must be between 0 and 100; every other value must be between -100 and 100.',
        'Curve points use normalized x/y coordinates, must start at (0,0), end at (1,1), and have strictly increasing unique x values. Keep curves purposeful and normally use 3–6 points.',
        'Crop, mask, and point coordinates are normalized to the visible image: top-left is (0,0), bottom-right is (1,1). Crop width and height must remain inside the image. Use masks only when a local edit is visually justified.',
        'Horizontal and vertical perspective corrections range from -100 to 100. Keep both at zero unless visible converging architecture or a receding plane clearly benefits from a bounded keystone correction.',
        'Do not claim that edits were applied. Explain the visual reasoning so every proposed value remains reviewable.'
      ].join('\n')
    }), 'an editing proposal');
    return {
      suggestedIntent: result.suggestedIntent,
      critique: result.critique,
      strengths: result.strengths,
      opportunities: result.opportunities,
      explanation: result.explanation,
      operations: this.mapper.map(result)
    };
  }
}
