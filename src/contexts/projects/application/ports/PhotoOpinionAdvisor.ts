export type PhotoOpinionContext = {
  projectName: string;
  preview: Blob;
  shadowClipping: number;
  highlightClipping: number;
};

export type PhotoOpinion = {
  suggestedIntent: string;
  critique: string;
  strengths: string[];
  opportunities: string[];
};

export interface PhotoOpinionAdvisor {
  review(context: PhotoOpinionContext): Promise<PhotoOpinion>;
}
