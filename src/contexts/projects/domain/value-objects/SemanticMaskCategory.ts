import { Enum } from '@haskou/value-objects';

const semanticMaskCategories = ['sky', 'water', 'vegetation', 'people', 'buildings'] as const;
export type SemanticMaskCategoryPrimitive = (typeof semanticMaskCategories)[number];

export class SemanticMaskCategory extends Enum<SemanticMaskCategoryPrimitive> {
  private constructor(value: SemanticMaskCategoryPrimitive) { super(value); }

  public static fromPrimitives(value: SemanticMaskCategoryPrimitive): SemanticMaskCategory {
    return new SemanticMaskCategory(value);
  }

  public getValues(): SemanticMaskCategoryPrimitive[] {
    return [...semanticMaskCategories];
  }
}
