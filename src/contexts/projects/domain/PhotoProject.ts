import { StringValueObject, Timestamp } from '@haskou/value-objects';
import {
  AiDevelopmentJournal,
  type AiDevelopmentAdvice,
  type AiDevelopmentAdviceStatus,
  type AiDevelopmentJournalPrimitives
} from './AiDevelopmentJournal';
import { CaptureMetadata, type CaptureMetadataPrimitives } from './CaptureMetadata';
import { CurveChannel, ToneCurve } from './ToneCurve';
import { DevelopmentRecipe, type DevelopmentRecipePrimitives, type DevelopmentSettingsPrimitives } from './DevelopmentRecipe';
import { EDIT_OPERATION, type EditOperation } from './EditOperation';
import { EditHistory, type EditHistoryPrimitives } from './EditHistory';
import { MaskDefinition } from './MaskDefinition';
import { ProjectMetadata } from './ProjectMetadata';
import { ProjectOrganization } from './ProjectOrganization';
import { type ProjectDomainEvent } from './ProjectDomainEvent';
import { ProjectSchemaVersion } from './ProjectSchemaVersion';
import { InterfaceMode, ProjectUiState, type InterfaceModePrimitive } from './ProjectUiState';
import { PhotoProjectSummary } from './PhotoProjectSummary';
import { SourceImageReference, type SourceImageMimeType } from './SourceImageReference';
import { ViewportTransform } from './ViewportTransform';
import { AdjustmentKey } from './value-objects/AdjustmentKey';
import type { AiDevelopmentAdviceId } from './value-objects/AiDevelopmentAdviceId';
import { GlobalAdjustmentValue } from './value-objects/GlobalAdjustmentValue';
import { MaskId } from './value-objects/MaskId';
import { ProjectId } from './value-objects/ProjectId';
import { ProjectName } from './value-objects/ProjectName';
import { ProjectRating } from './value-objects/ProjectRating';
import { ProjectTags } from './value-objects/ProjectTags';

export type PhotoProjectPrimitives = {
  schemaVersion: number;
  id: string;
  name: string;
  source: { fileName: string; mimeType: SourceImageMimeType; size: number; storageKey: string };
  metadata: { createdAt: number; updatedAt: number; width: number; height: number };
  captureMetadata: CaptureMetadataPrimitives;
  organization: { rating: number; tags: string[]; favorite: boolean };
  aiDevelopment: AiDevelopmentJournalPrimitives;
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
    private readonly captureMetadata: CaptureMetadata,
    private readonly recipe: DevelopmentRecipe,
    private readonly history: EditHistory,
    private readonly uiState: ProjectUiState,
    private readonly organization: ProjectOrganization,
    private readonly aiDevelopment: AiDevelopmentJournal
  ) {}

  public static create(
    id: ProjectId,
    name: ProjectName,
    source: SourceImageReference,
    metadata: ProjectMetadata,
    captureMetadata: CaptureMetadata,
    historyLimit = 100
  ): PhotoProject {
    const project = new PhotoProject(
      new ProjectSchemaVersion(ProjectSchemaVersion.CURRENT),
      id,
      name,
      source,
      metadata,
      captureMetadata,
      DevelopmentRecipe.neutral(),
      new EditHistory(historyLimit),
      new ProjectUiState(InterfaceMode.SIMPLE),
      new ProjectOrganization(ProjectRating.UNRATED, ProjectTags.fromPrimitives([]), false),
      AiDevelopmentJournal.empty()
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
      CaptureMetadata.fromPrimitives(input.captureMetadata),
      DevelopmentRecipe.fromPrimitives(input.recipe),
      EditHistory.fromPrimitives(input.history),
      new ProjectUiState(InterfaceMode.fromPrimitives(input.uiState.mode)),
      new ProjectOrganization(
        new ProjectRating(input.organization.rating),
        ProjectTags.fromPrimitives(input.organization.tags),
        input.organization.favorite
      ),
      AiDevelopmentJournal.fromPrimitives(input.aiDevelopment)
    );
  }

  public duplicate(id: ProjectId, source: SourceImageReference, metadata: ProjectMetadata): PhotoProject {
    const duplicate = new PhotoProject(
      new ProjectSchemaVersion(ProjectSchemaVersion.CURRENT),
      id,
      this.name.copy(),
      source,
      metadata,
      CaptureMetadata.fromPrimitives(this.captureMetadata.toPrimitives()),
      DevelopmentRecipe.fromPrimitives(this.recipe.toPrimitives()),
      new EditHistory(100),
      new ProjectUiState(this.uiState.getMode()),
      new ProjectOrganization(
        new ProjectRating(this.organization.getRating()),
        ProjectTags.fromPrimitives(this.organization.getTags().toPrimitives()),
        this.organization.isFavorite()
      ),
      AiDevelopmentJournal.fromPrimitives(this.aiDevelopment.toPrimitives())
    );
    duplicate.recordEvent('PhotoProjectWasCreated', metadata.getCreatedAt());
    return duplicate;
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

  public recordAiDevelopmentAdvice(advice: AiDevelopmentAdvice, at: Timestamp): void {
    this.aiDevelopment.record(advice);
    this.markChanged(at);
  }

  public decideAiDevelopmentAdvice(id: AiDevelopmentAdviceId, status: AiDevelopmentAdviceStatus, at: Timestamp): void {
    this.aiDevelopment.decide(id, status);
    this.markChanged(at);
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

  public getCaptureMetadata(): CaptureMetadata {
    return CaptureMetadata.fromPrimitives(this.captureMetadata.toPrimitives());
  }

  public getRating(): ProjectRating {
    return this.organization.getRating();
  }

  public getTags(): ProjectTags {
    return this.organization.getTags();
  }

  public isFavorite(): boolean { return this.organization.isFavorite(); }

  public getSummary(): PhotoProjectSummary {
    return new PhotoProjectSummary(
      this.id,
      this.name,
      this.metadata.getUpdatedAt(),
      this.source.getMimeType(),
      this.organization.getRating(),
      this.organization.getTags(),
      this.organization.isFavorite()
    );
  }

  public getGlobalAdjustment(key: AdjustmentKey): GlobalAdjustmentValue {
    return this.recipe.getGlobalAdjustment(key);
  }

  public isGlobalAdjustmentEnabled(key: AdjustmentKey): boolean {
    return this.recipe.isGlobalAdjustmentEnabled(key);
  }

  public isGlobalAdjustmentModified(key: AdjustmentKey): boolean {
    return !this.recipe.getGlobalAdjustment(key).isZero();
  }

  public hasCurveAdjustments(): boolean {
    return this.recipe.hasCurveAdjustments();
  }

  public hasGeometryAdjustments(): boolean {
    return this.recipe.hasGeometryAdjustments();
  }

  public hasMasks(): boolean {
    return this.recipe.hasMasks();
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

  public getRecipe(): DevelopmentRecipe {
    return DevelopmentRecipe.fromPrimitives(this.recipe.toPrimitives());
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

  public getHistoryTimeline(): { applied: EditOperation[]; availableRedo: EditOperation[] } {
    return this.history.getTimeline();
  }

  public getAiDevelopmentJournal(): AiDevelopmentJournalPrimitives {
    return this.aiDevelopment.toPrimitives();
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
      captureMetadata: this.captureMetadata.toPrimitives(),
      organization: {
        rating: this.organization.getRating().valueOf(),
        tags: this.organization.getTags().toPrimitives(),
        favorite: this.organization.isFavorite()
      },
      aiDevelopment: this.aiDevelopment.toPrimitives(),
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
    if (operation.kind === EDIT_OPERATION.REPLACE_RECIPE) {
      const previous = this.recipe.toPrimitives();
      this.recipe.replaceRecipe(operation.recipe);
      return { ...operation, recipe: previous };
    }
    if (operation.kind === EDIT_OPERATION.SET_PROJECT_RATING) {
      const previous = this.organization.getRating();
      this.organization.changeRating(new ProjectRating(operation.rating));
      return { ...operation, rating: previous.valueOf() };
    }
    if (operation.kind === EDIT_OPERATION.SET_PROJECT_TAGS) {
      const previous = this.organization.getTags();
      this.organization.replaceTags(ProjectTags.fromPrimitives(operation.tags));
      return { ...operation, tags: previous.toPrimitives() };
    }
    if (operation.kind === EDIT_OPERATION.SET_PROJECT_FAVORITE) {
      const previous = this.organization.isFavorite();
      this.organization.chooseFavorite(operation.favorite);
      return { ...operation, favorite: previous };
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
