import type { PhotoProject } from '../../domain/PhotoProject';
import { AdjustmentKey } from '../../domain/value-objects/AdjustmentKey';
import type { DevelopmentGuidanceItem, DevelopmentTutor } from '../ports/DevelopmentTutor';
import type { ReviewDevelopmentMessage } from './messages/ReviewDevelopmentMessage';

export class ReviewDevelopment {
  public constructor(private readonly tutor: DevelopmentTutor) {}

  public review(project: PhotoProject, message: ReviewDevelopmentMessage): DevelopmentGuidanceItem[] {
    if (!project.isIdentifiedBy(message.getProjectId())) {
      throw new Error('The development review belongs to a different project.');
    }
    return this.tutor.review({
      shadowClipping: message.getShadowClipping(),
      highlightClipping: message.getHighlightClipping(),
      adjustments: Object.fromEntries(AdjustmentKey.all().map((key) => [
        key.valueOf(),
        project.getGlobalAdjustment(key).valueOf()
      ]))
    });
  }
}
