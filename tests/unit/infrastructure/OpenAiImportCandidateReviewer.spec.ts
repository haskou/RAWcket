import type { OpenAiResponsesClient, OpenAiStructuredRequest } from '@/contexts/ai/infrastructure/openai/OpenAiResponsesClient';
import { OpenAiImportCandidateReviewer } from '@/contexts/projects/infrastructure/advisors/OpenAiImportCandidateReviewer';

describe('OpenAiImportCandidateReviewer', () => {
  it('returns comparative post-edit assessments and keeps every candidate identifier', async () => {
    const reason = vi.fn<(request: OpenAiStructuredRequest) => Promise<unknown>>().mockResolvedValue({ assessments: [
      { candidateId: 'candidate-2', score: 93, rank: 1, reasons: ['Decisive moment', 'Strong crop options', 'Recoverable light'], focusPotential: 'Eyes appear usable', reframingPotential: 'Room for a tighter crop', editingPotential: 'Highlight detail can be shaped', visualInterest: 'Layered gesture', story: 'Clear relationship' },
      { candidateId: 'candidate-1', score: 62, rank: 2, reasons: ['Quieter moment', 'Usable focus', 'Less separation'], focusPotential: 'Acceptable', reframingPotential: 'Limited', editingPotential: 'Moderate', visualInterest: 'Conventional', story: 'Less clear' }
    ] });
    const client = { reason } as unknown as OpenAiResponsesClient;
    const reviewer = new OpenAiImportCandidateReviewer(client);

    const assessments = await reviewer.review([
      { candidateId: 'candidate-1', fileName: 'one.jpg', preview: new Blob(['one']), width: 4000, height: 3000 },
      { candidateId: 'candidate-2', fileName: 'two.jpg', preview: new Blob(['two']), width: 4000, height: 3000 }
    ]);

    expect(assessments[0]?.candidateId).toBe('candidate-2');
    expect(assessments[0]?.evaluation.story).toBe('Clear relationship');
    expect(reason.mock.calls[0]?.[0].images.map((image) => image.label)).toEqual(['candidate-1', 'candidate-2']);
  });
});
