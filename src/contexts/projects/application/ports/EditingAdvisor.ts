import type { EditOperation } from '../../domain/EditOperation';
import type { CurveSetPrimitives } from '../../domain/ToneCurve';
import type { ViewportTransformPrimitives } from '../../domain/ViewportTransform';

export type EditingContext = {
  projectName: string;
  intent: string | null;
  preview: Blob;
  shadowClipping: number;
  highlightClipping: number;
  currentAdjustments: Record<string, number>;
  currentCurves: CurveSetPrimitives;
  currentViewport: ViewportTransformPrimitives;
  existingMaskCount: number;
};

export type EditProposal = {
  suggestedIntent: string;
  critique: string;
  strengths: string[];
  opportunities: string[];
  explanation: string;
  operations: EditOperation[];
};

export interface EditingAdvisor {
  propose(context: EditingContext): Promise<EditProposal>;
}
