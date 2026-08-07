import type { EditingAdvisor, EditingContext, EditProposal } from '../../application/ports/EditingAdvisor';
import type { OpenAiResponsesClient } from '@/contexts/ai/infrastructure/openai/OpenAiResponsesClient';
import { parseAiStructuredResult } from '@/contexts/ai/infrastructure/validation/parseAiStructuredResult';
import { openAiEditProposalJsonSchema, openAiEditProposalSchema, type OpenAiEditProposal } from './OpenAiEditProposalContract';
import type { OpenAiEditProposalMapper } from './OpenAiEditProposalMapper';

export class OpenAiEditingAdvisor implements EditingAdvisor {
  public constructor(
    private readonly client: OpenAiResponsesClient,
    private readonly mapper: OpenAiEditProposalMapper
  ) {}

  public async propose(context: EditingContext): Promise<EditProposal> {
    const request = {
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
        'The supplied image is the CURRENT rendered state after the active recipe, not the untouched original. Judge it as shown and propose absolute final settings that build on that current state.',
        'Return a candid critique, strengths, opportunities, a concrete suggestedIntent, and a complete editable proposal in this single response.',
        'Judge the visible photograph, preserve believable color and texture, and propose any combination of global adjustments, monotonic-cubic tone curves, crop and geometry, radial masks, linear gradient masks, luminance-range masks, and point-guided smart masks that materially supports the intent.',
        'A complete RAWcket proposal is not slider-only. The toneCurves field must contain at least one purposeful tone curve and the localMasks field must contain at least one purposeful local mask in this FIRST response. For a scene without a safely identifiable semantic subject, use a restrained luminance-range, linear-gradient, or radial mask instead of inventing a subject.',
        'Use multiple local masks when different subjects, depth planes, or tonal regions need independent treatment. Multiple tone-curve operations are also supported when they target different channels (RGB, luminance, red, green, or blue); return at most one curve operation per channel, with as many control points as that channel needs.',
        'Treat the supplied render as the color-managed photographic baseline. When a matching camera JPEG was imported with a RAW file, RAWcket has already matched the RAW baseline to its tone and color; do not undo that calibration. Otherwise judge only what is visibly present. Diagnose visible color casts, weak chroma, compressed midtones, or haze independently instead of applying blanket exposure or saturation.',
        'The default finish must look photographically rich and natural, never pale, milky, faded, or low-density unless the photographer explicitly requests that aesthetic. Preserve a convincing black point, luminous rather than grey highlights, midtone separation, and the scene’s existing warm/cool atmosphere.',
        'When the visible image looks flat or washed out, restore separation with a restrained RGB or luminance tone curve and modest vibrance where needed. Prefer curve shape, black/white placement, local contrast, and vibrance over blanket exposure, lifted shadows, or heavy saturation. Do not combine raised blacks, strongly opened shadows, and reduced color density.',
        'Do not neutralize expressive color merely because it is not neutral daylight. Reduce saturation only when the supplied current render is visibly excessive or the photographer asks for it; otherwise preserve or gently strengthen perceptual color density while keeping skin and memory colors believable.',
        'Make an explicit framing decision on every request. Unless the current frame is already clearly optimal, include exactly one viewport operation with a purposeful crop and any justified rotation or perspective correction. Never omit a beneficial crop merely because it is more complex than a slider, and explain the compositional gain.',
        'Use smart-mask only for a visually identifiable subject or region. Supply normalized positive/negative points and optional bounding boxes; the resulting local spatial-luminance segmentation remains editable in RAWcket.',
        'Return absolute slider values, not deltas. Exposure must be between -5 and 5. Sharpness and noiseReduction must be between 0 and 100; every other value must be between -100 and 100.',
        'Curve points use normalized x/y coordinates, must start at (0,0), end at (1,1), and have strictly increasing unique x values. Keep curves purposeful and normally use 3–6 points.',
        'Crop, mask, and point coordinates are normalized to the visible image: top-left is (0,0), bottom-right is (1,1). Crop width and height must remain inside the image. Use masks only when a local edit is visually justified.',
        'Horizontal and vertical perspective corrections range from -100 to 100. Keep both at zero unless visible converging architecture or a receding plane clearly benefits from a bounded keystone correction.',
        'Do not claim that edits were applied. Explain the visual reasoning so every proposed value remains reviewable.'
      ].join('\n')
    };
    let result = parseAiStructuredResult(openAiEditProposalSchema, await this.client.reason(request), 'an editing proposal');
    const missing = this.missingRequestedViewport(context, result);
    if (missing.length > 0) {
      result = parseAiStructuredResult(openAiEditProposalSchema, await this.client.reason({
        ...request,
        instructions: `${request.instructions}\nYour previous proposal contradicted the requested/recommended edit by omitting: ${missing.join(', ')}. Return a corrected complete proposal and include those operation kinds explicitly.`
      }), 'a repaired editing proposal');
      const stillMissing = this.missingRequestedViewport(context, result);
      if (stillMissing.length > 0) throw new Error('AI Companion omitted the explicitly requested crop twice. No incomplete proposal was accepted.');
    }
    return {
      suggestedIntent: result.suggestedIntent,
      critique: result.critique,
      strengths: result.strengths,
      opportunities: result.opportunities,
      explanation: result.explanation,
      operations: this.mapper.map(result)
    };
  }

  private missingRequestedViewport(context: EditingContext, result: OpenAiEditProposal): string[] {
    const requested = context.intent ?? '';
    const missing: string[] = [];
    if (/(crop|cropping|reframe|reframing|recort|encuadr)/iu.test(requested) && !result.operations.some((operation) => operation.kind === 'viewport')) missing.push('crop/viewport');
    return missing;
  }
}
