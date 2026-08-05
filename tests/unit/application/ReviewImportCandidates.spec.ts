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
    review.mockResolvedValueOnce({ score: 42, reasons: ['Soft detail.'] }).mockResolvedValueOnce({ score: 91, reasons: ['Strong detail.'] });
    const soft = new File(['soft'], 'soft.jpg', { type: 'image/jpeg' });
    const strong = new File(['strong'], 'strong.jpg', { type: 'image/jpeg' });

    const candidates = await new ReviewImportCandidates(inspector, reviewer).review(new ReviewImportCandidatesMessage([soft, strong]));

    expect(candidates.map((candidate) => candidate.file.name)).toEqual(['strong.jpg', 'soft.jpg']);
    expect(candidates[0]?.reasons).toEqual(['Strong detail.']);
    expect(inspect).toHaveBeenCalledTimes(2);
  });

  it('rejects contact sheets outside the supported size', () => {
    expect(() => new ReviewImportCandidatesMessage([new File(['one'], 'one.jpg')])).toThrow(/between 2 and 20/);
  });
});
