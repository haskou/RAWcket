import type {
  DevelopmentGuidanceItem,
  DevelopmentTutor,
  DevelopmentTutorContext
} from '../../application/ports/DevelopmentTutor';

export class LocalDevelopmentTutor implements DevelopmentTutor {
  public review(context: DevelopmentTutorContext): DevelopmentGuidanceItem[] {
    const guidance: DevelopmentGuidanceItem[] = [];
    this.reviewClipping(context, guidance);
    this.reviewShadowNoise(context, guidance);
    this.reviewMicrocontrast(context, guidance);
    if (guidance.length === 0) guidance.push(this.balancedFrame());
    return guidance;
  }

  private reviewClipping(context: DevelopmentTutorContext, guidance: DevelopmentGuidanceItem[]): void {
    if (context.highlightClipping >= 0.001) {
      guidance.push({
        kind: 'measurement',
        severity: context.highlightClipping >= 0.01 ? 'warning' : 'notice',
        title: 'Highlights touch the output ceiling',
        detail: 'Lower Highlights first to recover upper-tone separation; use Whites only to place the final white point.',
        evidence: `${this.percentage(context.highlightClipping)} of rendered pixels are clipped in the highlights.`,
        targetPanel: 'light'
      });
    }
    if (context.shadowClipping >= 0.001) {
      guidance.push({
        kind: 'measurement',
        severity: context.shadowClipping >= 0.02 ? 'warning' : 'notice',
        title: 'Some shadows have no output detail',
        detail: 'Raise Shadows for local dark detail or Blacks for the overall black point. A small clipped area may be intentional.',
        evidence: `${this.percentage(context.shadowClipping)} of rendered pixels are clipped in the shadows.`,
        targetPanel: 'light'
      });
    }
  }

  private reviewShadowNoise(context: DevelopmentTutorContext, guidance: DevelopmentGuidanceItem[]): void {
    const shadows = context.adjustments.shadows ?? 0;
    const noiseReduction = context.adjustments.noiseReduction ?? 0;
    if (shadows <= 45 || noiseReduction >= 15) return;
    guidance.push({
      kind: 'suggestion',
      severity: 'notice',
      title: 'Lifted shadows may reveal noise',
      detail: 'Inspect the photograph at 100% before adding modest noise reduction. Avoid smoothing detail that is already clean.',
      evidence: `Shadows are ${this.signed(shadows)} while Noise Reduction is ${this.signed(noiseReduction)}.`,
      targetPanel: 'detail'
    });
  }

  private reviewMicrocontrast(context: DevelopmentTutorContext, guidance: DevelopmentGuidanceItem[]): void {
    const clarity = context.adjustments.clarity ?? 0;
    const sharpness = context.adjustments.sharpness ?? 0;
    if (clarity <= 35 || sharpness <= 45) return;
    guidance.push({
      kind: 'suggestion',
      severity: 'notice',
      title: 'Strong edge treatments can compound',
      detail: 'Clarity changes broad local contrast while Sharpness targets fine edges. Check halos at 100% and reduce one before increasing both.',
      evidence: `Clarity is ${this.signed(clarity)} and Sharpness is ${this.signed(sharpness)}.`,
      targetPanel: 'detail'
    });
  }

  private balancedFrame(): DevelopmentGuidanceItem {
    return {
      kind: 'measurement',
      severity: 'neutral',
      title: 'No technical warning in the rendered frame',
      detail: 'The histogram shows no material output clipping. Continue from visual intent; a balanced histogram is not a creative requirement.',
      evidence: 'Shadow and highlight clipping are both below 0.1%.',
      targetPanel: 'curves'
    };
  }

  private percentage(value: number): string {
    return `${(value * 100).toFixed(value < 0.01 ? 2 : 1)}%`;
  }

  private signed(value: number): string {
    return `${value > 0 ? '+' : ''}${value}`;
  }
}
