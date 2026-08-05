import type {
  SemanticModelDescriptor,
  SemanticModelStatus,
  SemanticModelTaskOptions,
  SemanticSegmentationModel
} from '../ports/SemanticSegmentationModel';

export class ManageSemanticSegmentationModel {
  public constructor(private readonly model: SemanticSegmentationModel) {}

  public describe(): SemanticModelDescriptor { return this.model.describe(); }
  public inspect(): Promise<SemanticModelStatus> { return this.model.inspect(); }
  public install(options: SemanticModelTaskOptions): Promise<void> { return this.model.install(options); }
  public remove(): Promise<void> { return this.model.remove(); }
}
