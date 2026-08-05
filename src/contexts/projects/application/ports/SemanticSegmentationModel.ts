import type {
  SemanticMaskCategory,
  SemanticMaskCategoryPrimitive
} from '../../domain/value-objects/SemanticMaskCategory';

export type SemanticModelDescriptor = {
  id: string;
  version: string;
  approximateDownloadBytes: number;
  supportedCategories: SemanticMaskCategoryPrimitive[];
};

export type SemanticModelStatus = 'unavailable' | 'not-installed' | 'installed';

export type SemanticMaskSuggestion = {
  positivePoints: Array<{ x: number; y: number }>;
  boundingBoxes: Array<{ x: number; y: number; width: number; height: number }>;
  confidence: number | null;
};

export type SemanticModelTaskOptions = {
  signal: AbortSignal;
  onProgress?: (completed: number) => void;
};

export interface SemanticSegmentationModel {
  describe(): SemanticModelDescriptor;
  inspect(): Promise<SemanticModelStatus>;
  install(options: SemanticModelTaskOptions): Promise<void>;
  remove(): Promise<void>;
  suggest(image: Blob, category: SemanticMaskCategory, options: SemanticModelTaskOptions): Promise<SemanticMaskSuggestion>;
}
