import type { OpenAiResponsesClient, OpenAiStructuredRequest } from '@/contexts/ai/infrastructure/openai/OpenAiResponsesClient';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import { OpenAiEditProposalMapper } from '@/contexts/projects/infrastructure/advisors/OpenAiEditProposalMapper';
import { OpenAiEditingAdvisor } from '@/contexts/projects/infrastructure/advisors/OpenAiEditingAdvisor';

describe('OpenAiEditingAdvisor', () => {
  it('returns domain-validated curves, crop geometry, and local masks alongside global adjustments', async () => {
    const reason = vi.fn<(request: OpenAiStructuredRequest) => Promise<unknown>>().mockResolvedValue({
      explanation: 'Shape the tonal hierarchy, tighten the frame, and guide attention locally.',
      operations: [
        { kind: 'global-adjustment', key: 'contrast', value: 14 },
        { kind: 'tone-curve', channel: 'rgb', interpolation: 'monotonic-cubic', points: [{ x: 0, y: 0 }, { x: 0.25, y: 0.18 }, { x: 0.75, y: 0.82 }, { x: 1, y: 1 }] },
        { kind: 'viewport', cropFrame: { x: 0.1, y: 0.05, width: 0.8, height: 0.9 }, translation: { x: 0.5, y: 0.5 }, scale: 1, rotationDegrees: -0.4, flipHorizontal: false, flipVertical: false, aspectRatio: null },
        { kind: 'radial-mask', center: { x: 0.48, y: 0.42 }, radiusX: 0.2, radiusY: 0.3, rotationDegrees: 0, inverted: false, opacity: 0.8, feather: 0.6, density: 1, localAdjustments: [{ key: 'exposure', value: 0.35 }] }
      ]
    });
    const advisor = new OpenAiEditingAdvisor({ reason } as unknown as OpenAiResponsesClient, new OpenAiEditProposalMapper());

    const proposal = await advisor.propose({
      projectName: 'Portrait', intent: 'Create a restrained cinematic portrait', preview: new Blob(['preview']),
      currentAdjustments: { contrast: 0 },
      currentCurves: {
        rgb: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        red: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        green: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        blue: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], interpolation: 'monotonic-cubic' },
        luminance: null
      },
      currentViewport: { cropFrame: { x: 0, y: 0, width: 1, height: 1 }, translation: { x: 0.5, y: 0.5 }, scale: 1, rotationDegrees: 0, flipHorizontal: false, flipVertical: false, aspectRatio: null },
      existingMaskCount: 0
    });

    expect(proposal.operations.map((operation) => operation.kind)).toEqual([
      EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT,
      EDIT_OPERATION.SET_CURVE,
      EDIT_OPERATION.SET_VIEWPORT_TRANSFORM,
      EDIT_OPERATION.ADD_MASK
    ]);
    expect(reason.mock.calls[0]?.[0].instructions).toContain('radial masks');
  });

  it('rejects malformed curve coordinates before they reach the recipe', () => {
    const mapper = new OpenAiEditProposalMapper();
    expect(() => mapper.map({
      explanation: 'Invalid ordering',
      operations: [{ kind: 'tone-curve', channel: 'rgb', interpolation: 'monotonic-cubic', points: [{ x: 0, y: 0 }, { x: 0.8, y: 0.7 }, { x: 0.6, y: 0.8 }, { x: 1, y: 1 }] }]
    })).toThrow(/increasing, unique x/);
  });
});
