import type { EditOperation } from '../../domain/EditOperation';
import { EDIT_OPERATION } from '../../domain/EditOperation';
import { MaskDefinition, type MaskDefinitionPrimitives } from '../../domain/MaskDefinition';
import { CurveChannel, ToneCurve } from '../../domain/ToneCurve';
import { ViewportTransform } from '../../domain/ViewportTransform';
import { AdjustmentKey } from '../../domain/value-objects/AdjustmentKey';
import { GlobalAdjustmentValue } from '../../domain/value-objects/GlobalAdjustmentValue';
import type { OpenAiEditProposal } from './OpenAiEditProposalContract';

export class OpenAiEditProposalMapper {
  public map(proposal: OpenAiEditProposal): EditOperation[] {
    this.rejectDuplicateTargets(proposal);
    return proposal.operations.map((operation) => {
      if (operation.kind === 'global-adjustment') {
        const key = AdjustmentKey.fromPrimitives(operation.key);
        return {
          kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT,
          key: key.valueOf(),
          value: GlobalAdjustmentValue.clamp(key, operation.value).valueOf(),
          groupId: null
        };
      }
      if (operation.kind === 'tone-curve') {
        const channel = CurveChannel.fromPrimitives(operation.channel);
        const curve = ToneCurve.fromPrimitives({ points: operation.points, interpolation: operation.interpolation });
        return { kind: EDIT_OPERATION.SET_CURVE, channel: channel.valueOf(), curve: curve.toPrimitives(), groupId: null };
      }
      if (operation.kind === 'viewport') {
        const viewport = ViewportTransform.fromPrimitives({
          cropFrame: operation.cropFrame,
          translation: operation.translation,
          scale: operation.scale,
          rotationDegrees: operation.rotationDegrees,
          flipHorizontal: operation.flipHorizontal,
          flipVertical: operation.flipVertical,
          aspectRatio: operation.aspectRatio
        });
        return { kind: EDIT_OPERATION.SET_VIEWPORT_TRANSFORM, viewport: viewport.toPrimitives(), groupId: null };
      }
      const mask = MaskDefinition.fromPrimitives(this.mask(operation));
      return { kind: EDIT_OPERATION.ADD_MASK, mask: mask.toPrimitives(), groupId: null };
    });
  }

  private mask(operation: Extract<OpenAiEditProposal['operations'][number], { kind: 'radial-mask' | 'linear-gradient-mask' | 'luminance-range-mask' }>): MaskDefinitionPrimitives {
    const common = {
      id: crypto.randomUUID(),
      enabled: true,
      inverted: operation.inverted,
      opacity: operation.opacity,
      feather: operation.feather,
      density: operation.density,
      localAdjustments: Object.fromEntries(operation.localAdjustments.map(({ key, value }) => {
        const adjustmentKey = AdjustmentKey.fromPrimitives(key);
        return [adjustmentKey.valueOf(), GlobalAdjustmentValue.clamp(adjustmentKey, value).valueOf()];
      }))
    };
    if (operation.kind === 'radial-mask') {
      return { ...common, shape: { kind: 'radial', center: operation.center, radiusX: operation.radiusX, radiusY: operation.radiusY, rotationDegrees: operation.rotationDegrees } };
    }
    if (operation.kind === 'linear-gradient-mask') {
      return { ...common, shape: { kind: 'linear-gradient', start: operation.start, end: operation.end } };
    }
    return { ...common, shape: { kind: 'luminance-range', minimum: operation.minimum, maximum: operation.maximum } };
  }

  private rejectDuplicateTargets(proposal: OpenAiEditProposal): void {
    const targets = proposal.operations.map((operation) => {
      if (operation.kind === 'global-adjustment') return `adjustment:${operation.key}`;
      if (operation.kind === 'tone-curve') return `curve:${operation.channel}`;
      if (operation.kind === 'viewport') return 'viewport';
      return null;
    }).filter((target): target is string => target !== null);
    if (new Set(targets).size !== targets.length) {
      throw new Error('OpenAI returned more than one operation for the same editable target.');
    }
  }
}
