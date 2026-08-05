import type {
  EditingAdvisor,
  EditingContext,
  EditProposal
} from '../../application/ports/EditingAdvisor';
import { EDIT_OPERATION, type EditOperation } from '../../domain/EditOperation';
import { AdjustmentKey, type AdjustmentKeyPrimitive } from '../../domain/value-objects/AdjustmentKey';
import { GlobalAdjustmentValue } from '../../domain/value-objects/GlobalAdjustmentValue';

type AdjustmentDelta = Partial<Record<AdjustmentKeyPrimitive, number>>;

export class LocalRecipeAdvisor implements EditingAdvisor {
  public propose(context: EditingContext): Promise<EditProposal> {
    const normalizedIntent = context.intent.toLowerCase();
    const { explanation, deltas } = this.chooseRecipe(normalizedIntent);
    return Promise.resolve({
      explanation: `${explanation} This proposal was generated locally from your words; no photograph or metadata left the browser.`,
      operations: this.operations(deltas, context)
    });
  }

  private chooseRecipe(intent: string): { explanation: string; deltas: AdjustmentDelta } {
    if (intent.includes('night') || intent.includes('cinematic') || intent.includes('film')) {
      return {
        explanation: 'A cinematic night treatment adds separation while keeping bright signs and lamps under control.',
        deltas: { contrast: 14, highlights: -32, shadows: 9, temperature: -7, tint: 4, saturation: -5, dehaze: 9, vignette: -18 }
      };
    }
    if (intent.includes('portrait') || intent.includes('skin')) {
      return {
        explanation: 'A restrained portrait treatment protects highlights, opens facial shadows, and reduces hard local contrast.',
        deltas: { exposure: 0.25, highlights: -22, shadows: 16, vibrance: 8, clarity: -6, texture: -4, temperature: 4 }
      };
    }
    if (intent.includes('highlight') || intent.includes('bright')) {
      return {
        explanation: 'A technical highlight recovery treatment lowers the upper tonal range without flattening the entire frame.',
        deltas: { highlights: -48, whites: -18, shadows: 7 }
      };
    }
    if (intent.includes('landscape') || intent.includes('sky')) {
      return {
        explanation: 'A natural landscape treatment improves atmospheric separation and color without pushing global saturation.',
        deltas: { highlights: -20, shadows: 14, vibrance: 16, clarity: 8, texture: 10, dehaze: 10, contrast: 7 }
      };
    }
    return {
      explanation: 'A neutral technical treatment improves tonal balance and detail while preserving the original character.',
      deltas: { highlights: -18, shadows: 12, contrast: 6, vibrance: 6, clarity: 4, sharpness: 8 }
    };
  }

  private operations(deltas: AdjustmentDelta, context: EditingContext): EditOperation[] {
    return Object.entries(deltas).map(([keyPrimitive, delta]) => {
      const key = AdjustmentKey.fromString(keyPrimitive);
      const current = context.currentAdjustments[key.valueOf()] ?? 0;
      const value = GlobalAdjustmentValue.clamp(key, current + delta).valueOf();
      return {
        kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT,
        key: key.valueOf(),
        value,
        groupId: null
      };
    });
  }
}
