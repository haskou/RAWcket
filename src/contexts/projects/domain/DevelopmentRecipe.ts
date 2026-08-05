import type { CurveChannel, ToneCurve} from './ToneCurve';
import { CurveSet, type CurveSetPrimitives } from './ToneCurve';
import { GlobalAdjustments, type GlobalAdjustmentsPrimitives } from './GlobalAdjustments';
import { MaskDefinition, type MaskDefinitionPrimitives } from './MaskDefinition';
import { ViewportTransform, type ViewportTransformPrimitives } from './ViewportTransform';
import { AdjustmentKey, type AdjustmentKeyPrimitive } from './value-objects/AdjustmentKey';
import type { GlobalAdjustmentValue } from './value-objects/GlobalAdjustmentValue';
import type { MaskId } from './value-objects/MaskId';

export type DevelopmentRecipePrimitives = {
  globalAdjustments: GlobalAdjustmentsPrimitives;
  curves: CurveSetPrimitives;
  viewport: ViewportTransformPrimitives;
  masks: MaskDefinitionPrimitives[];
  disabledGlobalAdjustments: AdjustmentKeyPrimitive[];
};

export type DevelopmentSettingsPrimitives = Pick<
  DevelopmentRecipePrimitives,
  'globalAdjustments' | 'curves' | 'disabledGlobalAdjustments'
>;

export class DevelopmentRecipe {
  public constructor(
    private globalAdjustments: GlobalAdjustments,
    private curves: CurveSet,
    private viewport: ViewportTransform,
    private masks: MaskDefinition[],
    private disabledGlobalAdjustments: AdjustmentKey[]
  ) {}

  public static neutral(): DevelopmentRecipe {
    return new DevelopmentRecipe(GlobalAdjustments.neutral(), CurveSet.identity(), ViewportTransform.reset(), [], []);
  }

  public static fromPrimitives(input: DevelopmentRecipePrimitives): DevelopmentRecipe {
    return new DevelopmentRecipe(
      GlobalAdjustments.fromPrimitives(input.globalAdjustments),
      CurveSet.fromPrimitives(input.curves),
      ViewportTransform.fromPrimitives(input.viewport),
      input.masks.map((mask) => MaskDefinition.fromPrimitives(mask)),
      input.disabledGlobalAdjustments.map((key) => AdjustmentKey.fromPrimitives(key))
    );
  }

  public changeGlobalAdjustment(key: AdjustmentKey, value: GlobalAdjustmentValue): void {
    this.globalAdjustments = this.globalAdjustments.change(key, value);
  }

  public setGlobalAdjustmentEnabled(key: AdjustmentKey, enabled: boolean): void {
    if (enabled) {
      this.disabledGlobalAdjustments = this.disabledGlobalAdjustments.filter((candidate) => candidate.isNotEqual(key));
    } else if (!this.disabledGlobalAdjustments.some((candidate) => candidate.isEqual(key))) {
      this.disabledGlobalAdjustments = [...this.disabledGlobalAdjustments, key];
    }
  }

  public isGlobalAdjustmentEnabled(key: AdjustmentKey): boolean {
    return !this.disabledGlobalAdjustments.some((candidate) => candidate.isEqual(key));
  }

  public replaceCurve(channel: CurveChannel, curve: ToneCurve | null): void {
    this.curves = this.curves.replace(channel, curve);
  }

  public replaceViewport(viewport: ViewportTransform): void {
    this.viewport = viewport;
  }

  public replaceDevelopmentSettings(input: DevelopmentSettingsPrimitives): void {
    this.globalAdjustments = GlobalAdjustments.fromPrimitives(input.globalAdjustments);
    this.curves = CurveSet.fromPrimitives(input.curves);
    this.disabledGlobalAdjustments = input.disabledGlobalAdjustments.map((key) => AdjustmentKey.fromPrimitives(key));
  }

  public addMask(mask: MaskDefinition): void {
    if (this.masks.some((existing) => existing.isIdentifiedBy(mask.getId()))) {
      throw new Error('A mask with the same identifier already exists.');
    }
    this.masks = [...this.masks, mask];
  }

  public replaceMask(mask: MaskDefinition): void {
    const maskId = mask.getId();
    if (!this.masks.some((existing) => existing.isIdentifiedBy(maskId))) {
      throw new Error('A missing mask cannot be updated.');
    }
    this.masks = this.masks.map((existing) => (existing.isIdentifiedBy(maskId) ? mask : existing));
  }

  public removeMask(id: MaskId): MaskDefinition {
    const mask = this.masks.find((candidate) => candidate.isIdentifiedBy(id));
    if (mask === undefined) throw new Error('A missing mask cannot be removed.');
    this.masks = this.masks.filter((candidate) => !candidate.isIdentifiedBy(id));
    return mask;
  }

  public getGlobalAdjustment(key: AdjustmentKey): GlobalAdjustmentValue {
    return this.globalAdjustments.get(key);
  }

  public getCurve(channel: CurveChannel): ToneCurve | null {
    return this.curves.get(channel);
  }

  public getViewport(): ViewportTransform {
    return this.viewport;
  }

  public findMask(id: MaskId): MaskDefinition {
    const mask = this.masks.find((candidate) => candidate.isIdentifiedBy(id));
    if (mask === undefined) throw new Error('The requested mask does not exist.');
    return mask;
  }

  public getMasks(): MaskDefinition[] {
    return this.masks.map((mask) => MaskDefinition.fromPrimitives(mask.toPrimitives()));
  }

  public getDevelopmentSettings(): DevelopmentSettingsPrimitives {
    return {
      globalAdjustments: this.globalAdjustments.toPrimitives(),
      curves: this.curves.toPrimitives(),
      disabledGlobalAdjustments: this.disabledGlobalAdjustments.map((key) => key.valueOf())
    };
  }

  public toPrimitives(): DevelopmentRecipePrimitives {
    return {
      globalAdjustments: this.globalAdjustments.toPrimitives(),
      curves: this.curves.toPrimitives(),
      viewport: this.viewport.toPrimitives(),
      masks: this.masks.map((mask) => mask.toPrimitives()),
      disabledGlobalAdjustments: this.disabledGlobalAdjustments.map((key) => key.valueOf())
    };
  }
}
