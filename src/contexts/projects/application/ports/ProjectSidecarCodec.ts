import type { DevelopmentRecipePrimitives } from '../../domain/DevelopmentRecipe';
import type { PhotoProject } from '../../domain/PhotoProject';

export interface ProjectSidecarCodec {
  encode(project: PhotoProject): Blob;
  decode(sidecar: Blob): Promise<DevelopmentRecipePrimitives>;
}
