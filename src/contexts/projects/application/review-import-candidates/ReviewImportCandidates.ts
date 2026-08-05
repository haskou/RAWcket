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
  reasons: string[];
};

export class ReviewImportCandidates {
  private readonly queue = new Queue(QueueOptions.withConcurrency(2));

  public constructor(
    private readonly inspector: SourceImageInspector,
    private readonly reviewer: ImportCandidateReviewer
  ) {}

  public async review(message: ReviewImportCandidatesMessage): Promise<ReviewedImportCandidate[]> {
    const candidates = await Promise.all(message.getFiles().map((file) => this.queue.run(async () => {
      const inspection = await this.inspector.inspect(new InspectSourceImageMessage(file, file.name));
      const preview = inspection.embeddedPreview ?? file;
      const assessment = await this.reviewer.review(preview, inspection.width, inspection.height);
      return { file, inspection, preview, ...assessment };
    })));
    return candidates.sort((left, right) => right.score - left.score);
  }
}
