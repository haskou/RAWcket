import type { OpenAiResponsesClient, OpenAiStructuredRequest } from '@/contexts/ai/infrastructure/openai/OpenAiResponsesClient';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { OpenAiEditProposalMapper } from '@/contexts/projects/infrastructure/advisors/OpenAiEditProposalMapper';
import { OpenAiEditingAdvisor } from '@/contexts/projects/infrastructure/advisors/OpenAiEditingAdvisor';

const restrainedCurve = {
  kind: 'tone-curve', channel: 'rgb', interpolation: 'monotonic-cubic',
  points: [{ x: 0, y: 0 }, { x: 0.25, y: 0.2 }, { x: 0.75, y: 0.8 }, { x: 1, y: 1 }]
};
const restrainedLuminanceMask = {
  kind: 'luminance-range-mask', minimum: 0.35, maximum: 0.85,
  inverted: false, opacity: 0.65, feather: 0.55, density: 1,
  localAdjustments: [{ key: 'clarity', value: 5 }]
};

describe('OpenAiEditingAdvisor', () => {
  it('returns domain-validated curves, crop geometry, and local masks alongside global adjustments', async () => {
    const reason = vi.fn<(request: OpenAiStructuredRequest) => Promise<unknown>>().mockResolvedValue({
      suggestedIntent: 'Create a restrained portrait with a tighter frame.',
      critique: 'The subject is strong but the surrounding space dilutes the hierarchy.',
      strengths: ['Expression'], opportunities: ['Tighter crop'],
      explanation: 'Shape the tonal hierarchy, tighten the frame, and guide attention locally.',
      operations: [
        { kind: 'global-adjustment', key: 'contrast', value: 14 },
        { kind: 'tone-curve', channel: 'rgb', interpolation: 'monotonic-cubic', points: [{ x: 0, y: 0 }, { x: 0.25, y: 0.18 }, { x: 0.75, y: 0.82 }, { x: 1, y: 1 }] },
        { kind: 'tone-curve', channel: 'luminance', interpolation: 'monotonic-cubic', points: [{ x: 0, y: 0 }, { x: 0.4, y: 0.36 }, { x: 0.8, y: 0.84 }, { x: 1, y: 1 }] },
        { kind: 'viewport', cropFrame: { x: 0.1, y: 0.05, width: 0.8, height: 0.9 }, translation: { x: 0.5, y: 0.5 }, scale: 1, rotationDegrees: -0.4, horizontalPerspective: 6, verticalPerspective: -4, flipHorizontal: false, flipVertical: false, aspectRatio: null },
        { kind: 'radial-mask', center: { x: 0.48, y: 0.42 }, radiusX: 0.2, radiusY: 0.3, rotationDegrees: 0, inverted: false, opacity: 0.8, feather: 0.6, density: 1, localAdjustments: [{ key: 'exposure', value: 0.35 }] },
        { kind: 'smart-mask', prompt: 'face', positivePoints: [{ x: 0.48, y: 0.42 }], negativePoints: [{ x: 0.8, y: 0.5 }], boundingBoxes: [{ x: 0.3, y: 0.2, width: 0.35, height: 0.5 }], inverted: false, opacity: 0.7, feather: 0.4, density: 1, localAdjustments: [{ key: 'texture', value: 8 }] }
      ]
    });
    const advisor = new OpenAiEditingAdvisor({ reason } as unknown as OpenAiResponsesClient, new OpenAiEditProposalMapper());

    const proposal = await advisor.propose({
      projectName: 'Portrait', intent: 'Create a restrained cinematic portrait', preview: new Blob(['preview']),
      shadowClipping: 0.01, highlightClipping: 0.02,
      currentAdjustments: { contrast: 0 },
      currentCurves: {
        rgb: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        red: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        green: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        blue: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        luminance: null
      },
      currentViewport: { cropFrame: { x: 0, y: 0, width: 1, height: 1 }, translation: { x: 0.5, y: 0.5 }, scale: 1, rotationDegrees: 0, horizontalPerspective: 0, verticalPerspective: 0, flipHorizontal: false, flipVertical: false, aspectRatio: null },
      existingMaskCount: 0
    });

    expect(proposal.operations.map((operation) => operation.kind)).toEqual([
      EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT,
      EDIT_OPERATION.SET_CURVE,
      EDIT_OPERATION.SET_CURVE,
      EDIT_OPERATION.SET_VIEWPORT_TRANSFORM,
      EDIT_OPERATION.ADD_MASK,
      EDIT_OPERATION.ADD_MASK
    ]);
    expect(proposal.operations[3]).toMatchObject({ viewport: { horizontalPerspective: 6, verticalPerspective: -4 } });
    expect(reason.mock.calls[0]?.[0].instructions).toContain('radial masks');
    expect(reason.mock.calls[0]?.[0].instructions).toContain('Never omit a beneficial crop');
    expect(reason.mock.calls[0]?.[0].instructions).toContain('matching camera JPEG');
    expect(reason.mock.calls[0]?.[0].instructions).toContain('judge only what is visibly present');
    expect(reason.mock.calls[0]?.[0].instructions).toContain('restrained RGB or luminance tone curve');
    expect(reason.mock.calls[0]?.[0].instructions).toContain('not slider-only');
    expect(reason.mock.calls[0]?.[0].instructions).toContain('FIRST response');
    expect(reason.mock.calls[0]?.[0].instructions).toContain('multiple local masks');
    expect(reason.mock.calls[0]?.[0].instructions).toContain('different channels');
    expect(reason.mock.calls[0]?.[0].instructions).toContain('never pale, milky, faded, or low-density');
    expect(reason.mock.calls[0]?.[0].instructions).toContain('preserve or gently strengthen perceptual color density');
    expect(proposal.operations[5]).toMatchObject({ mask: { shape: { kind: 'ai-segmentation', prompt: 'face' } } });
  });

  it('keeps a complete open visual opinion to one call without forcing a crop', async () => {
    const reason = vi.fn<(request: OpenAiStructuredRequest) => Promise<unknown>>().mockResolvedValue({
      suggestedIntent: 'Keep the existing crop and add restrained tonal separation.',
      critique: 'The framing already supports the subject.', strengths: ['Composition'], opportunities: ['Midtone separation'],
      explanation: 'The crop is already effective, so only a small contrast adjustment is useful.',
      operations: [
        { kind: 'global-adjustment', key: 'contrast', value: 6 },
        restrainedCurve,
        restrainedLuminanceMask
      ]
    });
    const advisor = new OpenAiEditingAdvisor({ reason } as unknown as OpenAiResponsesClient, new OpenAiEditProposalMapper());

    await expect(advisor.propose({
      projectName: 'Street', intent: null, preview: new Blob(['preview']), shadowClipping: 0, highlightClipping: 0,
      currentAdjustments: {},
      currentCurves: {
        rgb: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        red: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        green: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        blue: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' }, luminance: null
      },
      currentViewport: { cropFrame: { x: 0, y: 0, width: 1, height: 1 }, translation: { x: 0.5, y: 0.5 }, scale: 1, rotationDegrees: 0, horizontalPerspective: 0, verticalPerspective: 0, flipHorizontal: false, flipVertical: false, aspectRatio: null },
      existingMaskCount: 0
    })).resolves.toMatchObject({ operations: [
      { kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT },
      { kind: EDIT_OPERATION.SET_CURVE },
      { kind: EDIT_OPERATION.ADD_MASK }
    ] });
    expect(reason).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed curve coordinates before they reach the recipe', () => {
    const mapper = new OpenAiEditProposalMapper();
    expect(() => mapper.map({
      suggestedIntent: 'Keep a natural hierarchy', critique: 'The frame needs structure', strengths: ['Subject'], opportunities: ['Tone'],
      explanation: 'Invalid ordering',
      operations: [{ kind: 'tone-curve', channel: 'rgb', interpolation: 'monotonic-cubic', points: [{ x: 0, y: 0 }, { x: 0.8, y: 0.7 }, { x: 0.6, y: 0.8 }, { x: 1, y: 1 }] }]
    })).toThrow(/increasing, unique x/);
  });

  it('repairs a proposal that recommends a crop but omits the viewport operation', async () => {
    const base = {
      suggestedIntent: 'Aplicar un recorte leve para dirigir la mirada.',
      critique: 'El encuadre tiene espacio prescindible.', strengths: ['Atmósfera'], opportunities: ['Recorte'],
      explanation: 'El recorte mejora la jerarquía.',
      operations: [
        { kind: 'global-adjustment', key: 'contrast', value: 5 },
        restrainedCurve,
        restrainedLuminanceMask
      ]
    };
    const viewport = { kind: 'viewport', cropFrame: { x: 0.05, y: 0.05, width: 0.9, height: 0.9 }, translation: { x: 0.5, y: 0.5 }, scale: 1, rotationDegrees: 0, horizontalPerspective: 0, verticalPerspective: 0, flipHorizontal: false, flipVertical: false, aspectRatio: null };
    const reason = vi.fn<(request: OpenAiStructuredRequest) => Promise<unknown>>()
      .mockResolvedValueOnce(base)
      .mockResolvedValueOnce({ ...base, operations: [...base.operations, viewport] });
    const advisor = new OpenAiEditingAdvisor({ reason } as unknown as OpenAiResponsesClient, new OpenAiEditProposalMapper());

    const proposal = await advisor.propose({
      projectName: 'Alley', intent: '¿Aplicarías un recorte?', preview: new Blob(['preview']), shadowClipping: 0, highlightClipping: 0,
      currentAdjustments: {},
      currentCurves: {
        rgb: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        red: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        green: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        blue: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' }, luminance: null
      },
      currentViewport: { cropFrame: { x: 0, y: 0, width: 1, height: 1 }, translation: { x: 0.5, y: 0.5 }, scale: 1, rotationDegrees: 0, horizontalPerspective: 0, verticalPerspective: 0, flipHorizontal: false, flipVertical: false, aspectRatio: null },
      existingMaskCount: 0
    });

    expect(reason).toHaveBeenCalledTimes(2);
    expect(reason.mock.calls[1]?.[0].instructions).toContain('crop/viewport');
    expect(proposal.operations.some((operation) => operation.kind === EDIT_OPERATION.SET_VIEWPORT_TRANSFORM)).toBe(true);
  });

  it('repairs a proposal that omits the required purposeful tone curve', async () => {
    const base = {
      suggestedIntent: 'Use a restrained tonal adjustment.',
      critique: 'The midtones lack separation.', strengths: ['Atmosphere'], opportunities: ['Tonal structure'],
      explanation: 'A small contrast adjustment will improve separation.',
      operations: [
        { kind: 'global-adjustment', key: 'contrast', value: 5 },
        restrainedLuminanceMask
      ]
    };
    const reason = vi.fn<(request: OpenAiStructuredRequest) => Promise<unknown>>()
      .mockResolvedValueOnce(base)
      .mockResolvedValueOnce({ ...base, operations: [...base.operations, restrainedCurve] });
    const advisor = new OpenAiEditingAdvisor({ reason } as unknown as OpenAiResponsesClient, new OpenAiEditProposalMapper());

    const proposal = await advisor.propose({
      projectName: 'Alley', intent: 'Apply an RGB tone curve', preview: new Blob(['preview']), shadowClipping: 0, highlightClipping: 0,
      currentAdjustments: {},
      currentCurves: {
        rgb: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        red: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        green: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        blue: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' }, luminance: null
      },
      currentViewport: { cropFrame: { x: 0, y: 0, width: 1, height: 1 }, translation: { x: 0.5, y: 0.5 }, scale: 1, rotationDegrees: 0, horizontalPerspective: 0, verticalPerspective: 0, flipHorizontal: false, flipVertical: false, aspectRatio: null },
      existingMaskCount: 0
    });

    expect(reason).toHaveBeenCalledTimes(2);
    expect(reason.mock.calls[1]?.[0].instructions).toContain('tone-curve');
    expect(proposal.operations.some((operation) => operation.kind === EDIT_OPERATION.SET_CURVE)).toBe(true);
  });

  it('repairs a slider-and-curve proposal that omits local masking', async () => {
    const base = {
      suggestedIntent: 'Build a natural hierarchy around the subject.',
      critique: 'The subject needs local separation.', strengths: ['Expression'], opportunities: ['Local hierarchy'],
      explanation: 'Global tone alone cannot direct attention precisely.',
      operations: [
        { kind: 'global-adjustment', key: 'contrast', value: 5 },
        restrainedCurve
      ]
    };
    const reason = vi.fn<(request: OpenAiStructuredRequest) => Promise<unknown>>()
      .mockResolvedValueOnce(base)
      .mockResolvedValueOnce({ ...base, operations: [...base.operations, restrainedLuminanceMask] });
    const advisor = new OpenAiEditingAdvisor({ reason } as unknown as OpenAiResponsesClient, new OpenAiEditProposalMapper());

    const proposal = await advisor.propose({
      projectName: 'Portrait', intent: 'Build a natural portrait', preview: new Blob(['preview']), shadowClipping: 0, highlightClipping: 0,
      currentAdjustments: {},
      currentCurves: {
        rgb: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        red: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        green: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        blue: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' }, luminance: null
      },
      currentViewport: { cropFrame: { x: 0, y: 0, width: 1, height: 1 }, translation: { x: 0.5, y: 0.5 }, scale: 1, rotationDegrees: 0, horizontalPerspective: 0, verticalPerspective: 0, flipHorizontal: false, flipVertical: false, aspectRatio: null },
      existingMaskCount: 0
    });

    expect(reason).toHaveBeenCalledTimes(2);
    expect(reason.mock.calls[1]?.[0].instructions).toContain('local mask');
    expect(proposal.operations.some((operation) => operation.kind === EDIT_OPERATION.ADD_MASK)).toBe(true);
  });
});
