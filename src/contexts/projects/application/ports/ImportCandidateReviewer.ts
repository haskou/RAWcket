export type ImportCandidateAssessment = {
  candidateId: string;
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

export type ImportCandidateForReview = {
  candidateId: string;
  fileName: string;
  preview: Blob;
  width: number;
  height: number;
};

export interface ImportCandidateReviewer {
  review(candidates: ImportCandidateForReview[]): Promise<ImportCandidateAssessment[]>;
}
