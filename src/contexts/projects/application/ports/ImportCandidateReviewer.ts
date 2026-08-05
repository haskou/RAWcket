export type ImportCandidateAssessment = {
  score: number;
  reasons: string[];
};

export interface ImportCandidateReviewer {
  review(preview: Blob, width: number, height: number): Promise<ImportCandidateAssessment>;
}
