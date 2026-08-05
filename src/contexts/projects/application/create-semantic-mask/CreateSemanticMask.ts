import type { PhotoProject } from '../../domain/PhotoProject';
import { MaskDefinition } from '../../domain/MaskDefinition';
import type { SemanticModelTaskOptions, SemanticSegmentationModel } from '../ports/SemanticSegmentationModel';
import type { CreateSemanticMaskMessage } from './messages/CreateSemanticMaskMessage';

export class CreateSemanticMask {
  public constructor(private readonly model: SemanticSegmentationModel) {}

  public async create(
    project: PhotoProject,
    message: CreateSemanticMaskMessage,
    options: SemanticModelTaskOptions
  ): Promise<MaskDefinition> {
    if (!project.isIdentifiedBy(message.getProjectId())) throw new Error('The semantic mask request belongs to a different project.');
    const suggestion = await this.model.suggest(message.getImage(), message.getCategory(), options);
    const descriptor = this.model.describe();
    const category = message.getCategory().valueOf();
    return MaskDefinition.fromPrimitives({
      id: message.getMaskId().valueOf(),
      enabled: true,
      inverted: false,
      opacity: 1,
      feather: 0.2,
      density: 1,
      localAdjustments: { exposure: 0.5 },
      shape: {
        kind: 'ai-segmentation',
        prompt: `Select ${category}`,
        positivePoints: suggestion.positivePoints,
        negativePoints: [],
        boundingBoxes: suggestion.boundingBoxes,
        strategy: descriptor.id,
        version: descriptor.version,
        semanticCategory: category,
        confidence: suggestion.confidence,
        rasterCacheKey: null
      }
    });
  }
}
