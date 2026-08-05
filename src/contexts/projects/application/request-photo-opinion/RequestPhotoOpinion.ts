import type { PhotoProject } from '../../domain/PhotoProject';
import type { PhotoOpinion, PhotoOpinionAdvisor } from '../ports/PhotoOpinionAdvisor';
import type { RequestPhotoOpinionMessage } from './messages/RequestPhotoOpinionMessage';

export class RequestPhotoOpinion {
  public constructor(private readonly advisor: PhotoOpinionAdvisor) {}

  public review(project: PhotoProject, message: RequestPhotoOpinionMessage): Promise<PhotoOpinion> {
    if (!project.isIdentifiedBy(message.getProjectId())) throw new Error('The AI opinion request belongs to a different project.');
    return this.advisor.review({
      projectName: project.getName().valueOf(),
      preview: message.getPreview(),
      shadowClipping: message.getShadowClipping(),
      highlightClipping: message.getHighlightClipping()
    });
  }
}
