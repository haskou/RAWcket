import type { AdjustmentKeyPrimitive } from './value-objects/AdjustmentKey';
import type { CurveChannelPrimitive, ToneCurvePrimitives } from './ToneCurve';
import type { MaskDefinitionPrimitives } from './MaskDefinition';
import type { ViewportTransformPrimitives } from './ViewportTransform';
import type { DevelopmentRecipePrimitives, DevelopmentSettingsPrimitives } from './DevelopmentRecipe';

export const EDIT_OPERATION = {
  SET_GLOBAL_ADJUSTMENT: 'set-global-adjustment',
  SET_GLOBAL_ADJUSTMENT_ENABLED: 'set-global-adjustment-enabled',
  SET_CURVE: 'set-curve',
  ADD_MASK: 'add-mask',
  UPDATE_MASK: 'update-mask',
  REMOVE_MASK: 'remove-mask',
  SET_VIEWPORT_TRANSFORM: 'set-viewport-transform',
  REPLACE_DEVELOPMENT_SETTINGS: 'replace-development-settings',
  REPLACE_RECIPE: 'replace-recipe',
  RENAME_PROJECT: 'rename-project',
  SET_PROJECT_RATING: 'set-project-rating',
  SET_PROJECT_TAGS: 'set-project-tags',
  SET_PROJECT_FAVORITE: 'set-project-favorite'
} as const;

type OperationMetadata = { groupId: string | null };

export type SetGlobalAdjustmentOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT;
  key: AdjustmentKeyPrimitive;
  value: number;
};
export type SetGlobalAdjustmentEnabledOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT_ENABLED;
  key: AdjustmentKeyPrimitive;
  enabled: boolean;
};
export type SetCurveOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.SET_CURVE;
  channel: CurveChannelPrimitive;
  curve: ToneCurvePrimitives | null;
};
export type AddMaskOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.ADD_MASK;
  mask: MaskDefinitionPrimitives;
};
export type UpdateMaskOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.UPDATE_MASK;
  mask: MaskDefinitionPrimitives;
};
export type RemoveMaskOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.REMOVE_MASK;
  maskId: string;
};
export type SetViewportTransformOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.SET_VIEWPORT_TRANSFORM;
  viewport: ViewportTransformPrimitives;
};
export type RenameProjectOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.RENAME_PROJECT;
  name: string;
};
export type ReplaceDevelopmentSettingsOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.REPLACE_DEVELOPMENT_SETTINGS;
  settings: DevelopmentSettingsPrimitives;
};
export type ReplaceRecipeOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.REPLACE_RECIPE;
  recipe: DevelopmentRecipePrimitives;
};
export type SetProjectRatingOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.SET_PROJECT_RATING;
  rating: number;
};
export type SetProjectTagsOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.SET_PROJECT_TAGS;
  tags: string[];
};
export type SetProjectFavoriteOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.SET_PROJECT_FAVORITE;
  favorite: boolean;
};

export type EditOperation =
  | SetGlobalAdjustmentOperation
  | SetGlobalAdjustmentEnabledOperation
  | SetCurveOperation
  | AddMaskOperation
  | UpdateMaskOperation
  | RemoveMaskOperation
  | SetViewportTransformOperation
  | ReplaceDevelopmentSettingsOperation
  | ReplaceRecipeOperation
  | RenameProjectOperation
  | SetProjectRatingOperation
  | SetProjectTagsOperation
  | SetProjectFavoriteOperation;
