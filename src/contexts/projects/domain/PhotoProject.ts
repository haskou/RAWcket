import { StringValueObject, Timestamp } from '@haskou/value-objects';
import { CurveChannel, ToneCurve } from './ToneCurve';
import { DevelopmentRecipe, type DevelopmentRecipePrimitives, type DevelopmentSettingsPrimitives } from './DevelopmentRecipe';
import { EDIT_OPERATION, type EditOperation } from './EditOperation';
import { EditHistory, type EditHistoryPrimitives } from './EditHistory';
import { MaskDefinition } from './MaskDefinition';
import { ProjectMetadata } from './ProjectMetadata';
import { type ProjectDomainEvent } from './ProjectDomainEvent';
import { ProjectSchemaVersion } from './ProjectSchemaVersion';
import { InterfaceMode, ProjectUiState, type InterfaceModePrimitive } from './ProjectUiState';
import { PhotoProjectSummary } from './PhotoProjectSummary';
import { SourceImageReference, type SourceImageMimeType } from './SourceImageReference';
import { ViewportTransform } from './ViewportTransform';
import { AdjustmentKey } from './value-objects/AdjustmentKey';
import { GlobalAdjustmentValue } from './value-objects/GlobalAdjustmentValue';
import { MaskId } from './value-objects/MaskId';
import { ProjectId } from './value-objects/ProjectId';
import { ProjectName } from './value-objects/ProjectName';

export type PhotoProjectPrimitives = {
  schemaVersion: number;
  id: string;
  name: string;
  source: { fileName: string; mimeType: SourceImageMimeType; size: number; storageKey: string };
  metadata: { createdAt: number; updatedAt: number; width: number; height: number };
  recipe: DevelopmentRecipePrimitives;
  history: EditHistoryPrimitives;
  uiState: { mode: InterfaceModePrimitive };
};

export class PhotoProject {
  private events: ProjectDomainEvent[] = [];

  private constructor(
    private readonly schemaVersion: ProjectSchemaVersion,
    private readonly id: ProjectId,
    private name: ProjectName,
    private readonly source: SourceImageReference,
    private metadata: ProjectMetadata,
    private readonly recipe: DevelopmentRecipe,
    private readonly history: EditHistory,
    private readonly uiState: ProjectUiState
  ) {}

  public static create(
    id: ProjectId,
    name: ProjectName,
    source: SourceImageReference,
    metadata: ProjectMetadata,
    historyLimit = 100
  ): PhotoProject {
    const project = new PhotoProject(
      new ProjectSchemaVersion(ProjectSchemaVersion.CURRENT),
      id,
      name,
      source,
      metadata,
      DevelopmentRecipe.neutral(),
      new EditHistory(historyLimit),
      new ProjectUiState(InterfaceMode.SIMPLE)
    );
    project.recordEvent('PhotoProjectWasCreated', metadata.getCreatedAt());
    return project;
  }

  public static fromPrimitives(input: PhotoProjectPrimitives): PhotoProject {
    return new PhotoProject(
      new ProjectSchemaVersion(input.schemaVersion),
      new ProjectId(input.id),
      new ProjectName(input.name),
      new SourceImageReference(
        new StringValueObject(input.source.fileName),
        new StringValueObject(input.source.mimeType),
        input.source.size,
        new StringValueObject(input.source.storageKey)
      ),
      new ProjectMetadata(
        Timestamp.new(input.metadata.createdAt),
        Timestamp.new(input.metadata.updatedAt),
        input.metadata.width,
        input.metadata.height
      ),
      DevelopmentRecipe.fromPrimitives(input.recipe),
      EditHistory.fromPrimitives(input.history),
      new ProjectUiState(InterfaceMode.fromPrimitives(input.uiState.mode))
    );
  }

  public apply(operation: EditOperation, at: Timestamp): void {
    const inverse = this.perform(operation);
    this.history.record(structuredClone(operation), inverse);
    this.markChanged(at);
  }

  public undo(at: Timestamp): boolean {
    const operation = this.history.takeUndo();
    if (operation === null) return false;
    this.perform(operation);
    this.markChanged(at);
    return true;
  }

  public redo(at: Timestamp): boolean {
    const operation = this.history.takeRedo();
    if (operation === null) return false;
    this.perform(operation);
    this.markChanged(at);
    return true;
  }

  public chooseInterfaceMode(mode: InterfaceMode): void {
    this.uiState.chooseMode(mode);
  }

  public getId(): ProjectId {
    return this.id;
  }

  public isIdentifiedBy(id: ProjectId): boolean {
    return this.id.isEqual(id);
  }

  public getName(): ProjectName {
    return this.name;
  }

  public getSource(): SourceImageReference {
    return this.source;
  }

  public getSummary(): PhotoProjectSummary {
    return new PhotoProjectSummary(
      this.id,
      this.name,
      this.metadata.getUpdatedAt(),
      this.source.getMimeType()
    );
  }

  public getGlobalAdjustment(key: AdjustmentKey): GlobalAdjustmentValue {
    return this.recipe.getGlobalAdjustment(key);
  }

  public isGlobalAdjustmentEnabled(key: AdjustmentKey): boolean {
    return this.recipe.isGlobalAdjustmentEnabled(key);
  }

  public getViewportTransform(): ViewportTransform {
    return ViewportTransform.fromPrimitives(this.recipe.getViewport().toPrimitives());
  }

  public getMasks(): MaskDefinition[] {
    return this.recipe.getMasks();
  }

  public getDevelopmentSettings(): DevelopmentSettingsPrimitives {
    return this.recipe.getDevelopmentSettings();
  }

  public getCurve(channel: CurveChannel): ToneCurve | null {
    const curve = this.recipe.getCurve(channel);
    return curve === null ? null : ToneCurve.fromPrimitives(curve.toPrimitives());
  }

  public getInterfaceMode(): InterfaceMode {
    return this.uiState.getMode();
  }

  public canUndo(): boolean {
    return this.history.canUndo();
  }

  public canRedo(): boolean {
    return this.history.canRedo();
  }

  public pullDomainEvents(): ProjectDomainEvent[] {
    const events = [...this.events];
    this.events = [];
    return events;
  }

  public toPrimitives(): PhotoProjectPrimitives {
    return {
      schemaVersion: this.schemaVersion.valueOf(),
      id: this.id.valueOf(),
      name: this.name.valueOf(),
      source: {
        fileName: this.source.getFileName().valueOf(),
        mimeType: this.source.getSupportedMimeType(),
        size: this.source.getSize(),
        storageKey: this.source.getStorageKey().valueOf()
      },
      metadata: {
        createdAt: this.metadata.getCreatedAt().toMilliseconds(),
        updatedAt: this.metadata.getUpdatedAt().toMilliseconds(),
        width: this.metadata.getWidth(),
        height: this.metadata.getHeight()
      },
      recipe: this.recipe.toPrimitives(),
      history: this.history.toPrimitives(),
      uiState: { mode: this.uiState.getMode().valueOf() }
    };
  }

  private perform(operation: EditOperation): EditOperation {
    if (operation.kind === EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT) {
      const key = AdjustmentKey.fromPrimitives(operation.key);
      const previous = this.recipe.getGlobalAdjustment(key);
      this.recipe.changeGlobalAdjustment(key, GlobalAdjustmentValue.for(key, operation.value));
      return { ...operation, value: previous.valueOf() };
    }
    if (operation.kind === EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT_ENABLED) {
      const key = AdjustmentKey.fromPrimitives(operation.key);
      const previous = this.recipe.isGlobalAdjustmentEnabled(key);
      this.recipe.setGlobalAdjustmentEnabled(key, operation.enabled);
      return { ...operation, enabled: previous };
    }
    if (operation.kind === EDIT_OPERATION.SET_CURVE) {
      const channel = CurveChannel.fromPrimitives(operation.channel);
      const previous = this.recipe.getCurve(channel);
      this.recipe.replaceCurve(channel, operation.curve === null ? null : ToneCurve.fromPrimitives(operation.curve));
      return { ...operation, curve: previous?.toPrimitives() ?? null };
    }
    if (operation.kind === EDIT_OPERATION.ADD_MASK) {
      const mask = MaskDefinition.fromPrimitives(operation.mask);
      this.recipe.addMask(mask);
      return { kind: EDIT_OPERATION.REMOVE_MASK, maskId: mask.getId().valueOf(), groupId: operation.groupId };
    }
    if (operation.kind === EDIT_OPERATION.UPDATE_MASK) {
      const mask = MaskDefinition.fromPrimitives(operation.mask);
      const previous = this.recipe.findMask(mask.getId());
      this.recipe.replaceMask(mask);
      return { ...operation, mask: previous.toPrimitives() };
    }
    if (operation.kind === EDIT_OPERATION.REMOVE_MASK) {
      const removed = this.recipe.removeMask(new MaskId(operation.maskId));
      return { kind: EDIT_OPERATION.ADD_MASK, mask: removed.toPrimitives(), groupId: operation.groupId };
    }
    if (operation.kind === EDIT_OPERATION.SET_VIEWPORT_TRANSFORM) {
      const previous = this.recipe.getViewport();
      this.recipe.replaceViewport(ViewportTransform.fromPrimitives(operation.viewport));
      return { ...operation, viewport: previous.toPrimitives() };
    }
    if (operation.kind === EDIT_OPERATION.REPLACE_DEVELOPMENT_SETTINGS) {
      const previous = this.recipe.getDevelopmentSettings();
      this.recipe.replaceDevelopmentSettings(operation.settings);
      return { ...operation, settings: previous };
    }
    const previousName = this.name;
    this.name = new ProjectName(operation.name);
    return { ...operation, name: previousName.valueOf() };
  }

  private markChanged(at: Timestamp): void {
    this.metadata = this.metadata.touch(at);
    this.recordEvent('PhotoProjectWasChanged', at);
  }

  private recordEvent(name: ProjectDomainEvent['name'], at: Timestamp): void {
    this.events.push({ name, projectId: this.id.valueOf(), occurredAt: at.toMilliseconds() });
  }
}
