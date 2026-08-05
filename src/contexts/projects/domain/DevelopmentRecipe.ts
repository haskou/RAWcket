import type { CurveChannel, ToneCurve} from './ToneCurve';
import { CurveSet, type CurveSetPrimitives } from './ToneCurve';
import { GlobalAdjustments, type GlobalAdjustmentsPrimitives } from './GlobalAdjustments';
import { MaskDefinition, type MaskDefinitionPrimitives } from './MaskDefinition';
import { ViewportTransform, type ViewportTransformPrimitives } from './ViewportTransform';
import type { AdjustmentKey } from './value-objects/AdjustmentKey';
import type { GlobalAdjustmentValue } from './value-objects/GlobalAdjustmentValue';
import type { MaskId } from './value-objects/MaskId';

export type DevelopmentRecipePrimitives = {
  globalAdjustments: GlobalAdjustmentsPrimitives;
  curves: CurveSetPrimitives;
  viewport: ViewportTransformPrimitives;
  masks: MaskDefinitionPrimitives[];
};

export class DevelopmentRecipe {
  public constructor(
    private globalAdjustments: GlobalAdjustments,
    private curves: CurveSet,
    private viewport: ViewportTransform,
    private masks: MaskDefinition[]
  ) {}

  public static neutral(): DevelopmentRecipe {
    return new DevelopmentRecipe(GlobalAdjustments.neutral(), CurveSet.identity(), ViewportTransform.reset(), []);
  }

  public static fromPrimitives(input: DevelopmentRecipePrimitives): DevelopmentRecipe {
    return new DevelopmentRecipe(
      GlobalAdjustments.fromPrimitives(input.globalAdjustments),
      CurveSet.fromPrimitives(input.curves),
      ViewportTransform.fromPrimitives(input.viewport),
      input.masks.map((mask) => MaskDefinition.fromPrimitives(mask))
    );
  }

  public changeGlobalAdjustment(key: AdjustmentKey, value: GlobalAdjustmentValue): void {
    this.globalAdjustments = this.globalAdjustments.change(key, value);
  }

  public replaceCurve(channel: CurveChannel, curve: ToneCurve | null): void {
    this.curves = this.curves.replace(channel, curve);
  }

  public replaceViewport(viewport: ViewportTransform): void {
    this.viewport = viewport;
  }

  public addMask(mask: MaskDefinition): void {
    if (this.masks.some((existing) => existing.isIdentifiedBy(mask.getId()))) {
      throw new Error('Ya existe una mascara con el mismo identificador.');
    }
    this.masks = [...this.masks, mask];
  }

  public replaceMask(mask: MaskDefinition): void {
    const maskId = mask.getId();
    if (!this.masks.some((existing) => existing.isIdentifiedBy(maskId))) {
      throw new Error('No se puede actualizar una mascara inexistente.');
    }
    this.masks = this.masks.map((existing) => (existing.isIdentifiedBy(maskId) ? mask : existing));
  }

  public removeMask(id: MaskId): MaskDefinition {
    const mask = this.masks.find((candidate) => candidate.isIdentifiedBy(id));
    if (mask === undefined) throw new Error('No se puede eliminar una mascara inexistente.');
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
    if (mask === undefined) throw new Error('La mascara solicitada no existe.');
    return mask;
  }

  public toPrimitives(): DevelopmentRecipePrimitives {
    return {
      globalAdjustments: this.globalAdjustments.toPrimitives(),
      curves: this.curves.toPrimitives(),
      viewport: this.viewport.toPrimitives(),
      masks: this.masks.map((mask) => mask.toPrimitives())
    };
  }
}
