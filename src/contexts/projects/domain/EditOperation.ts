import type { AdjustmentKeyPrimitive } from './value-objects/AdjustmentKey';
import type { CurveChannelPrimitive, ToneCurvePrimitives } from './ToneCurve';
import type { MaskDefinitionPrimitives } from './MaskDefinition';
import type { ViewportTransformPrimitives } from './ViewportTransform';

export const EDIT_OPERATION = {
  SET_GLOBAL_ADJUSTMENT: 'set-global-adjustment',
  SET_CURVE: 'set-curve',
  ADD_MASK: 'add-mask',
  UPDATE_MASK: 'update-mask',
  REMOVE_MASK: 'remove-mask',
  SET_VIEWPORT_TRANSFORM: 'set-viewport-transform',
  RENAME_PROJECT: 'rename-project'
} as const;

type OperationMetadata = { groupId: string | null };

export type SetGlobalAdjustmentOperation = OperationMetadata & {
  kind: typeof EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT;
  key: AdjustmentKeyPrimitive;
  value: number;
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

export type EditOperation =
  | SetGlobalAdjustmentOperation
  | SetCurveOperation
  | AddMaskOperation
  | UpdateMaskOperation
  | RemoveMaskOperation
  | SetViewportTransformOperation
  | RenameProjectOperation;
