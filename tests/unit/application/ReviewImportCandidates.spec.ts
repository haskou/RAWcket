import { emptyCaptureMetadata } from '@/contexts/projects/domain/CaptureMetadata';
import type { ImportCandidateReviewer } from '@/contexts/projects/application/ports/ImportCandidateReviewer';
import type { SourceImageInspector } from '@/contexts/projects/application/ports/SourceImageInspector';
import { ReviewImportCandidates } from '@/contexts/projects/application/review-import-candidates/ReviewImportCandidates';
import { ReviewImportCandidatesMessage } from '@/contexts/projects/application/review-import-candidates/messages/ReviewImportCandidatesMessage';

describe('ReviewImportCandidates', () => {
  it('bounds concurrency through the workflow and returns the strongest measured candidate first', async () => {
    const inspect = vi.fn<SourceImageInspector['inspect']>();
    const review = vi.fn<ImportCandidateReviewer['review']>();
    const inspector: SourceImageInspector = { inspect };
    const reviewer: ImportCandidateReviewer = { review };
    inspect.mockResolvedValue({
      width: 6000,
      height: 4000,
      mimeType: 'image/jpeg',
      embeddedPreview: null,
      captureMetadata: emptyCaptureMetadata
    });
    review.mockResolvedValue([
      { candidateId: 'candidate-1', score: 42, rank: 2, reasons: ['Soft detail.'], evaluation: { focusPotential: 'Soft', reframingPotential: 'Limited', editingPotential: 'Moderate', visualInterest: 'Quiet', story: 'Weak' } },
      { candidateId: 'candidate-2', score: 91, rank: 1, reasons: ['Strong moment.'], evaluation: { focusPotential: 'Strong', reframingPotential: 'Flexible', editingPotential: 'High', visualInterest: 'Strong', story: 'Clear' } }
    ]);
    const soft = new File(['soft'], 'soft.jpg', { type: 'image/jpeg' });
    const strong = new File(['strong'], 'strong.jpg', { type: 'image/jpeg' });

    const candidates = await new ReviewImportCandidates(inspector, reviewer).review(new ReviewImportCandidatesMessage([soft, strong]));

    expect(candidates.map((candidate) => candidate.file.name)).toEqual(['strong.jpg', 'soft.jpg']);
    expect(candidates[0]?.reasons).toEqual(['Strong moment.']);
    expect(inspect).toHaveBeenCalledTimes(2);
    expect(review).toHaveBeenCalledTimes(1);
    expect(review.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it('rejects contact sheets outside the supported size', () => {
    expect(() => new ReviewImportCandidatesMessage([new File(['one'], 'one.jpg')])).toThrow(/between 2 and 20/);
  });
});
