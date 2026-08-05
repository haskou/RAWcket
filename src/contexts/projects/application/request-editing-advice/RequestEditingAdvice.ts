import type { PhotoProject } from '../../domain/PhotoProject';
import { AdjustmentKey } from '../../domain/value-objects/AdjustmentKey';
import type { EditingAdvisor, EditProposal } from '../ports/EditingAdvisor';
import type { RequestEditingAdviceMessage } from './messages/RequestEditingAdviceMessage';

export class RequestEditingAdvice {
  public constructor(private readonly advisor: EditingAdvisor) {}

  public propose(project: PhotoProject, message: RequestEditingAdviceMessage): Promise<EditProposal> {
    if (!project.isIdentifiedBy(message.getProjectId())) {
      throw new Error('The AI editing request belongs to a different project.');
    }
    const recipe = project.toPrimitives().recipe;
    return this.advisor.propose({
      projectName: project.getName().valueOf(),
      intent: message.getIntent(),
      preview: message.getPreview(),
      currentAdjustments: {
        exposure: project.getGlobalAdjustment(AdjustmentKey.EXPOSURE).valueOf(),
        temperature: project.getGlobalAdjustment(AdjustmentKey.TEMPERATURE).valueOf(),
        tint: project.getGlobalAdjustment(AdjustmentKey.TINT).valueOf(),
        contrast: project.getGlobalAdjustment(AdjustmentKey.CONTRAST).valueOf(),
        highlights: project.getGlobalAdjustment(AdjustmentKey.HIGHLIGHTS).valueOf(),
        shadows: project.getGlobalAdjustment(AdjustmentKey.SHADOWS).valueOf(),
        whites: project.getGlobalAdjustment(AdjustmentKey.WHITES).valueOf(),
        blacks: project.getGlobalAdjustment(AdjustmentKey.BLACKS).valueOf(),
        saturation: project.getGlobalAdjustment(AdjustmentKey.SATURATION).valueOf(),
        vibrance: project.getGlobalAdjustment(AdjustmentKey.VIBRANCE).valueOf(),
        clarity: project.getGlobalAdjustment(AdjustmentKey.CLARITY).valueOf(),
        texture: project.getGlobalAdjustment(AdjustmentKey.TEXTURE).valueOf(),
        dehaze: project.getGlobalAdjustment(AdjustmentKey.DEHAZE).valueOf(),
        sharpness: project.getGlobalAdjustment(AdjustmentKey.SHARPNESS).valueOf(),
        noiseReduction: project.getGlobalAdjustment(AdjustmentKey.NOISE_REDUCTION).valueOf(),
        vignette: project.getGlobalAdjustment(AdjustmentKey.VIGNETTE).valueOf()
      },
      currentCurves: recipe.curves,
      currentViewport: recipe.viewport,
      existingMaskCount: recipe.masks.length
    });
  }
}
