import type { ProjectId } from '../../domain/value-objects/ProjectId';

export type PreviewRenderRequest = { projectId: ProjectId; maximumEdge: number };

export interface PreviewRenderer {
  render(request: PreviewRenderRequest): Promise<ImageBitmap | Blob>;
}
