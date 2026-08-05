import { SemanticMaskCategory, type SemanticMaskCategoryPrimitive } from '../../../domain/value-objects/SemanticMaskCategory';
import { MaskId } from '../../../domain/value-objects/MaskId';
import { ProjectId } from '../../../domain/value-objects/ProjectId';

export class CreateSemanticMaskMessage {
  private readonly projectId: ProjectId;
  private readonly maskId: MaskId;
  private readonly category: SemanticMaskCategory;

  public constructor(projectId: string, maskId: string, category: SemanticMaskCategoryPrimitive, private readonly image: Blob) {
    this.projectId = new ProjectId(projectId);
    this.maskId = new MaskId(maskId);
    this.category = SemanticMaskCategory.fromPrimitives(category);
    if (!image.type.startsWith('image/') || image.size === 0) throw new Error('Semantic masking requires a rendered image preview.');
  }

  public getProjectId(): ProjectId { return this.projectId; }
  public getMaskId(): MaskId { return this.maskId; }
  public getCategory(): SemanticMaskCategory { return this.category; }
  public getImage(): Blob { return this.image; }
}
