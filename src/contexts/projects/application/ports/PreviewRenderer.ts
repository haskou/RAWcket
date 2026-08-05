import type { ProjectId } from '../../domain/value-objects/ProjectId';
import type { PhotoProject } from '../../domain/PhotoProject';
import type { PreviewSize } from '../render-project-preview/PreviewSize';

export type PreviewRenderStage = 'queued' | 'decoding' | 'developing' | 'analyzing' | 'encoding' | 'cached';

export type PreviewAnalysis = {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
  shadowClipping: number;
  highlightClipping: number;
};

export type PreviewRenderProgress = {
  stage: PreviewRenderStage;
  completed: number;
};

export class PreviewRenderRequest {
  public constructor(
    private readonly projectId: ProjectId,
    private readonly size: PreviewSize,
    private readonly project: PhotoProject
  ) {}

  public getProjectId(): ProjectId {
    return this.projectId;
  }

  public getSize(): PreviewSize {
    return this.size;
  }

  public getProject(): PhotoProject {
    return this.project;
  }
}

export type PreviewRenderControl = {
  signal?: AbortSignal;
  onProgress?: (progress: PreviewRenderProgress) => void;
  onAnalysis?: (analysis: PreviewAnalysis) => void;
};

export interface PreviewRenderer {
  render(request: PreviewRenderRequest, control?: PreviewRenderControl): Promise<ImageBitmap | Blob>;
}
