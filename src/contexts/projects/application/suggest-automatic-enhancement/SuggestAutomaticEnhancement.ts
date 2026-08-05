import { EDIT_OPERATION, type EditOperation } from '../../domain/EditOperation';
import type { PhotoProject } from '../../domain/PhotoProject';
import { AdjustmentKey, type AdjustmentKeyPrimitive } from '../../domain/value-objects/AdjustmentKey';
import { GlobalAdjustmentValue } from '../../domain/value-objects/GlobalAdjustmentValue';
import type { SuggestAutomaticEnhancementMessage } from './messages/SuggestAutomaticEnhancementMessage';

export type AutomaticEnhancementSuggestion = {
  operation: EditOperation | null;
  changedAdjustments: AdjustmentKeyPrimitive[];
  explanation: string;
};

export class SuggestAutomaticEnhancement {
  private static readonly MINIMUM_HIGHLIGHT_CLIPPING = 0.01;
  private static readonly MINIMUM_SHADOW_CLIPPING = 0.02;

  public suggest(project: PhotoProject, message: SuggestAutomaticEnhancementMessage): AutomaticEnhancementSuggestion {
    if (!project.isIdentifiedBy(message.getProjectId())) {
      throw new Error('The automatic enhancement analysis belongs to a different project.');
    }
    const deltas = this.deltas(message);
    const changedAdjustments = Object.keys(deltas) as AdjustmentKeyPrimitive[];
    if (changedAdjustments.length === 0) {
      return {
        operation: null,
        changedAdjustments,
        explanation: 'No material output clipping was detected, so Auto Enhance left the recipe unchanged.'
      };
    }
    const settings = project.getDevelopmentSettings();
    const globalAdjustments = { ...settings.globalAdjustments };
    for (const keyName of changedAdjustments) {
      const key = AdjustmentKey.fromPrimitives(keyName);
      globalAdjustments[keyName] = GlobalAdjustmentValue.clamp(key, globalAdjustments[keyName] + (deltas[keyName] ?? 0)).valueOf();
    }
    return {
      operation: {
        kind: EDIT_OPERATION.REPLACE_DEVELOPMENT_SETTINGS,
        settings: {
          globalAdjustments,
          curves: settings.curves,
          disabledGlobalAdjustments: settings.disabledGlobalAdjustments.filter((key) => !changedAdjustments.includes(key))
        },
        groupId: null
      },
      changedAdjustments,
      explanation: `Auto Enhance corrected measurable ${changedAdjustments.map((key) => key === 'highlights' ? 'highlight clipping' : 'shadow clipping').join(' and ')}. It did not alter color, detail, curves, crop, or masks.`
    };
  }

  private deltas(message: SuggestAutomaticEnhancementMessage): Partial<Record<AdjustmentKeyPrimitive, number>> {
    const deltas: Partial<Record<AdjustmentKeyPrimitive, number>> = {};
    const highlightClipping = message.getHighlightClipping();
    const shadowClipping = message.getShadowClipping();
    if (highlightClipping >= SuggestAutomaticEnhancement.MINIMUM_HIGHLIGHT_CLIPPING) {
      deltas.highlights = -Math.min(12, Math.max(3, Math.round(highlightClipping * 200)));
    }
    if (shadowClipping >= SuggestAutomaticEnhancement.MINIMUM_SHADOW_CLIPPING) {
      deltas.shadows = Math.min(12, Math.max(3, Math.round(shadowClipping * 150)));
    }
    return deltas;
  }
}
