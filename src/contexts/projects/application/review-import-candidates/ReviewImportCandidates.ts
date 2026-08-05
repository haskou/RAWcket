import { Queue, QueueOptions } from '@haskou/flow';
import type { ImportCandidateReviewer } from '../ports/ImportCandidateReviewer';
import type { SourceImageInspection, SourceImageInspector } from '../ports/SourceImageInspector';
import { InspectSourceImageMessage } from '../inspect-source-image/messages/InspectSourceImageMessage';
import type { ReviewImportCandidatesMessage } from './messages/ReviewImportCandidatesMessage';

export type ReviewedImportCandidate = {
  file: File;
  inspection: SourceImageInspection;
  preview: Blob;
  score: number;
  rank: number;
  reasons: string[];
  evaluation: {
    focusPotential: string;
    reframingPotential: string;
    editingPotential: string;
    visualInterest: string;
    story: string;
  };
};

export class ReviewImportCandidates {
  private readonly queue = new Queue(QueueOptions.withConcurrency(2));

  public constructor(
    private readonly inspector: SourceImageInspector,
    private readonly reviewer: ImportCandidateReviewer
  ) {}

  public async review(message: ReviewImportCandidatesMessage): Promise<ReviewedImportCandidate[]> {
    const candidates = await Promise.all(message.getFiles().map((file, index) => this.queue.run(async () => {
      const inspection = await this.inspector.inspect(new InspectSourceImageMessage(file, file.name));
      const preview = inspection.embeddedPreview ?? file;
      return { candidateId: `candidate-${index + 1}`, file, inspection, preview };
    })));
    const assessments = await this.reviewer.review(candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      fileName: candidate.file.name,
      preview: candidate.preview,
      width: candidate.inspection.width,
      height: candidate.inspection.height
    })));
    const byId = new Map(assessments.map((assessment) => [assessment.candidateId, assessment]));
    const reviewed = candidates.map(({ candidateId, ...candidate }) => {
      const assessment = byId.get(candidateId);
      if (assessment === undefined) throw new Error(`AI Companion did not assess ${candidate.file.name}.`);
      return { ...candidate, ...assessment };
    });
    return reviewed.sort((left, right) => left.rank - right.rank || right.score - left.score);
  }
}
