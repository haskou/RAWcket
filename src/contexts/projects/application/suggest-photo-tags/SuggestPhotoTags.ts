import type { SemanticModelTaskOptions, SemanticSegmentationModel } from '../ports/SemanticSegmentationModel';
import { ProjectTags } from '../../domain/value-objects/ProjectTags';
import type { SuggestPhotoTagsMessage } from './messages/SuggestPhotoTagsMessage';

export class SuggestPhotoTags {
  public constructor(private readonly model: SemanticSegmentationModel) {}

  public async suggest(message: SuggestPhotoTagsMessage, options: SemanticModelTaskOptions): Promise<string[]> {
    const suggestions = await this.model.suggestTags(message.getImage(), options);
    return ProjectTags.fromPrimitives(suggestions.map((suggestion) => suggestion.tag)).toPrimitives();
  }
}
