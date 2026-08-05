import { Queue, QueueOptions } from '@haskou/flow';
import { ConfigureAi } from '@/contexts/ai/application/configure-ai/ConfigureAi';
import { InspectAiConfiguration } from '@/contexts/ai/application/inspect-ai-configuration/InspectAiConfiguration';
import { RemoveAi } from '@/contexts/ai/application/remove-ai/RemoveAi';
import { RemoveAiFromAccount } from '@/contexts/ai/application/remove-ai-from-account/RemoveAiFromAccount';
import { RestoreAiFromAccount } from '@/contexts/ai/application/restore-ai-from-account/RestoreAiFromAccount';
import { ManageCloudStorage } from '@/contexts/cloud-storage/application/manage-cloud-storage/ManageCloudStorage';
import { BrowserGoogleDriveGateway } from '@/contexts/cloud-storage/infrastructure/google/BrowserGoogleDriveGateway';
import { UnlockAi } from '@/contexts/ai/application/unlock-ai/UnlockAi';
import { BrowserAiImageEncoder } from '@/contexts/ai/infrastructure/openai/BrowserAiImageEncoder';
import { OpenAiResponsesClient } from '@/contexts/ai/infrastructure/openai/OpenAiResponsesClient';
import { BrowserApiKeyVault } from '@/contexts/ai/infrastructure/security/BrowserApiKeyVault';
import { ApplyEditOperation } from '@/contexts/projects/application/apply-edit-operation/ApplyEditOperation';
import { ApplyProjectSidecar } from '@/contexts/projects/application/apply-project-sidecar/ApplyProjectSidecar';
import { AssessImportCapacity } from '@/contexts/projects/application/assess-import-capacity/AssessImportCapacity';
import { ChangeHistory } from '@/contexts/projects/application/change-history/ChangeHistory';
import { ChooseInterfaceMode } from '@/contexts/projects/application/choose-interface-mode/ChooseInterfaceMode';
import { CopyDevelopmentSettings } from '@/contexts/projects/application/copy-development-settings/CopyDevelopmentSettings';
import { CreateProject } from '@/contexts/projects/application/create-project/CreateProject';
import { CreateSemanticMask } from '@/contexts/projects/application/create-semantic-mask/CreateSemanticMask';
import { DeleteProject } from '@/contexts/projects/application/delete-project/DeleteProject';
import { DecideAiDevelopmentAdvice } from '@/contexts/projects/application/decide-ai-development-advice/DecideAiDevelopmentAdvice';
import { DuplicateProject } from '@/contexts/projects/application/duplicate-project/DuplicateProject';
import { EstimateHorizon } from '@/contexts/projects/application/estimate-horizon/EstimateHorizon';
import { ExportProjectPhoto } from '@/contexts/projects/application/export-project-photo/ExportProjectPhoto';
import { ExportProjectSidecar } from '@/contexts/projects/application/export-project-sidecar/ExportProjectSidecar';
import { FindProject } from '@/contexts/projects/application/find-project/FindProject';
import { ListProjects } from '@/contexts/projects/application/list-projects/ListProjects';
import { ManageSemanticSegmentationModel } from '@/contexts/projects/application/manage-semantic-segmentation-model/ManageSemanticSegmentationModel';
import { ManageRecipePresets } from '@/contexts/projects/application/manage-recipe-presets/ManageRecipePresets';
import { InspectSourceImage } from '@/contexts/projects/application/inspect-source-image/InspectSourceImage';
import { SaveProject } from '@/contexts/projects/application/save-project/SaveProject';
import { SuggestPhotoTags } from '@/contexts/projects/application/suggest-photo-tags/SuggestPhotoTags';
import { SuggestAutomaticEnhancement } from '@/contexts/projects/application/suggest-automatic-enhancement/SuggestAutomaticEnhancement';
import { RenderProjectPreview } from '@/contexts/projects/application/render-project-preview/RenderProjectPreview';
import { RenderProjectBaseline } from '@/contexts/projects/application/render-project-baseline/RenderProjectBaseline';
import { RequestEditingAdvice } from '@/contexts/projects/application/request-editing-advice/RequestEditingAdvice';
import { RequestPhotoOpinion } from '@/contexts/projects/application/request-photo-opinion/RequestPhotoOpinion';
import { ReviewDevelopment } from '@/contexts/projects/application/review-development/ReviewDevelopment';
import { ReviewImportCandidates } from '@/contexts/projects/application/review-import-candidates/ReviewImportCandidates';
import { ReconcileProjectAssets } from '@/contexts/projects/application/reconcile-project-assets/ReconcileProjectAssets';
import { RecordAiDevelopmentAdvice } from '@/contexts/projects/application/record-ai-development-advice/RecordAiDevelopmentAdvice';
import { PasteDevelopmentSettings } from '@/contexts/projects/application/paste-development-settings/PasteDevelopmentSettings';
import type { ProjectExporter } from '@/contexts/projects/application/ports/ProjectExporter';
import type { ProjectImporter } from '@/contexts/projects/application/ports/ProjectImporter';
import type { SourceFileRepository } from '@/contexts/projects/domain/repositories/SourceFileRepository';
import { RawcketProjectBundle } from '@/contexts/projects/infrastructure/bundles/RawcketProjectBundle';
import { BrowserSourceImageInspector } from '@/contexts/projects/infrastructure/codecs/BrowserSourceImageInspector';
import { ArwEmbeddedPreviewExtractor } from '@/contexts/projects/infrastructure/codecs/ArwEmbeddedPreviewExtractor';
import { LibRawImageDecoder } from '@/contexts/projects/infrastructure/codecs/LibRawImageDecoder';
import { ProjectMigrator } from '@/contexts/projects/infrastructure/migrations/ProjectMigrator';
import { VersionZeroToOneProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionZeroToOneProjectMigration';
import { VersionOneToTwoProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionOneToTwoProjectMigration';
import { VersionTwoToThreeProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionTwoToThreeProjectMigration';
import { VersionThreeToFourProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionThreeToFourProjectMigration';
import { VersionFourToFiveProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionFourToFiveProjectMigration';
import { VersionFiveToSixProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionFiveToSixProjectMigration';
import { VersionSixToSevenProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionSixToSevenProjectMigration';
import { VersionSevenToEightProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionSevenToEightProjectMigration';
import { VersionEightToNineProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionEightToNineProjectMigration';
import { BrowserSourceFileRepository } from '@/contexts/projects/infrastructure/repositories/BrowserSourceFileRepository';
import { IndexedDbProjectRepository } from '@/contexts/projects/infrastructure/repositories/IndexedDbProjectRepository';
import { IndexedDbRecipePresetRepository } from '@/contexts/projects/infrastructure/repositories/IndexedDbRecipePresetRepository';
import { JsonRecipePresetCodec } from '@/contexts/projects/infrastructure/presets/JsonRecipePresetCodec';
import { IndexedDbProjectAssetJournal } from '@/contexts/projects/infrastructure/repositories/IndexedDbProjectAssetJournal';
import { WorkerPreviewRenderer } from '@/contexts/projects/infrastructure/renderers/WorkerPreviewRenderer';
import { CachingPreviewRenderer } from '@/contexts/projects/infrastructure/renderers/CachingPreviewRenderer';
import { WorkerPhotoExporter } from '@/contexts/projects/infrastructure/renderers/WorkerPhotoExporter';
import { RenderSourceDecoder } from '@/contexts/projects/infrastructure/renderers/RenderSourceDecoder';
import { LocalDevelopmentTutor } from '@/contexts/projects/infrastructure/advisors/LocalDevelopmentTutor';
import { OpenAiEditingAdvisor } from '@/contexts/projects/infrastructure/advisors/OpenAiEditingAdvisor';
import { OpenAiEditProposalMapper } from '@/contexts/projects/infrastructure/advisors/OpenAiEditProposalMapper';
import { OpenAiImportCandidateReviewer } from '@/contexts/projects/infrastructure/advisors/OpenAiImportCandidateReviewer';
import { OpenAiPhotoOpinionAdvisor } from '@/contexts/projects/infrastructure/advisors/OpenAiPhotoOpinionAdvisor';
import { BrowserSemanticSegmentationModel } from '@/contexts/projects/infrastructure/ai/BrowserSemanticSegmentationModel';
import { BrowserHorizonEstimator } from '@/contexts/projects/infrastructure/analysis/BrowserHorizonEstimator';
import { BrowserDevelopmentSettingsClipboard } from '@/contexts/projects/infrastructure/clipboard/BrowserDevelopmentSettingsClipboard';
import { JsonProjectSidecarCodec } from '@/contexts/projects/infrastructure/sidecars/JsonProjectSidecarCodec';
import { RawcketDatabase } from '@/shared/infrastructure/database/RawcketDatabase';
import { RawcketSettingsRepository } from '@/shared/infrastructure/settings/RawcketSettingsRepository';
import { PersistentStorageRequest } from '@/shared/infrastructure/storage/PersistentStorageRequest';
import { BrowserLocalStorageInspector } from '@/shared/infrastructure/storage/BrowserLocalStorageInspector';

export type Application = {
  createProject: CreateProject;
  createSemanticMask: CreateSemanticMask;
  assessImportCapacity: AssessImportCapacity;
  findProject: FindProject;
  listProjects: ListProjects;
  manageSemanticSegmentationModel: ManageSemanticSegmentationModel;
  manageRecipePresets: ManageRecipePresets;
  applyEditOperation: ApplyEditOperation;
  applyProjectSidecar: ApplyProjectSidecar;
  changeHistory: ChangeHistory;
  chooseInterfaceMode: ChooseInterfaceMode;
  copyDevelopmentSettings: CopyDevelopmentSettings;
  pasteDevelopmentSettings: PasteDevelopmentSettings;
  saveProject: SaveProject;
  suggestPhotoTags: SuggestPhotoTags;
  suggestAutomaticEnhancement: SuggestAutomaticEnhancement;
  deleteProject: DeleteProject;
  decideAiDevelopmentAdvice: DecideAiDevelopmentAdvice;
  duplicateProject: DuplicateProject;
  estimateHorizon: EstimateHorizon;
  sourceFiles: SourceFileRepository;
  projectExporter: ProjectExporter;
  projectImporter: ProjectImporter;
  configureAi: ConfigureAi;
  inspectAiConfiguration: InspectAiConfiguration;
  unlockAi: UnlockAi;
  removeAi: RemoveAi;
  removeAiFromAccount: RemoveAiFromAccount;
  restoreAiFromAccount: RestoreAiFromAccount;
  manageCloudStorage: ManageCloudStorage;
  persistentStorage: PersistentStorageRequest;
  renderProjectPreview: RenderProjectPreview;
  renderProjectBaseline: RenderProjectBaseline;
  requestEditingAdvice: RequestEditingAdvice;
  recordAiDevelopmentAdvice: RecordAiDevelopmentAdvice;
  requestPhotoOpinion: RequestPhotoOpinion;
  reviewDevelopment: ReviewDevelopment;
  reviewImportCandidates: ReviewImportCandidates;
  reconcileProjectAssets: ReconcileProjectAssets;
  exportProjectPhoto: ExportProjectPhoto;
  exportProjectSidecar: ExportProjectSidecar;
  inspectSourceImage: InspectSourceImage;
};

export function createApplication(databaseName = 'rawcket'): Application {
  const database = RawcketDatabase.open(databaseName);
  const migrator = new ProjectMigrator([
    new VersionZeroToOneProjectMigration(),
    new VersionOneToTwoProjectMigration(),
    new VersionTwoToThreeProjectMigration(),
    new VersionThreeToFourProjectMigration(),
    new VersionFourToFiveProjectMigration(),
    new VersionFiveToSixProjectMigration(),
    new VersionSixToSevenProjectMigration(),
    new VersionSevenToEightProjectMigration(),
    new VersionEightToNineProjectMigration()
  ]);
  const projects = new IndexedDbProjectRepository(database, migrator);
  const recipePresets = new IndexedDbRecipePresetRepository(database);
  const sourceFiles = new BrowserSourceFileRepository(database);
  const projectAssetJournal = new IndexedDbProjectAssetJournal(database);
  const projectAssetQueue = new Queue(QueueOptions.withConcurrency(1));
  const bundle = new RawcketProjectBundle(projects, sourceFiles, migrator, projectAssetJournal, projectAssetQueue);
  const settings = new RawcketSettingsRepository(database);
  const previewSourceDecoder = new RenderSourceDecoder(
    new LibRawImageDecoder(undefined, undefined, 90_000),
    new ArwEmbeddedPreviewExtractor()
  );
  const exportSourceDecoder = new RenderSourceDecoder(
    new LibRawImageDecoder(undefined, undefined, 150_000),
    new ArwEmbeddedPreviewExtractor()
  );
  const previewRenderer = new CachingPreviewRenderer(new WorkerPreviewRenderer(sourceFiles, previewSourceDecoder));
  const developmentSettingsClipboard = new BrowserDevelopmentSettingsClipboard();
  const semanticSegmentationModel = new BrowserSemanticSegmentationModel();
  const sourceImageInspector = new BrowserSourceImageInspector();
  const projectSidecarCodec = new JsonProjectSidecarCodec();
  const aiCredentialVault = new BrowserApiKeyVault(settings);
  const googleDrive = new BrowserGoogleDriveGateway(settings, import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '');
  const openAi = new OpenAiResponsesClient(aiCredentialVault, new BrowserAiImageEncoder());
  return {
    createProject: new CreateProject(projects, sourceFiles, projectAssetJournal, projectAssetQueue),
    createSemanticMask: new CreateSemanticMask(semanticSegmentationModel),
    assessImportCapacity: new AssessImportCapacity(new BrowserLocalStorageInspector()),
    findProject: new FindProject(projects),
    listProjects: new ListProjects(projects),
    manageSemanticSegmentationModel: new ManageSemanticSegmentationModel(semanticSegmentationModel),
    manageRecipePresets: new ManageRecipePresets(recipePresets, new JsonRecipePresetCodec()),
    applyEditOperation: new ApplyEditOperation(),
    applyProjectSidecar: new ApplyProjectSidecar(projectSidecarCodec),
    changeHistory: new ChangeHistory(),
    chooseInterfaceMode: new ChooseInterfaceMode(),
    copyDevelopmentSettings: new CopyDevelopmentSettings(developmentSettingsClipboard),
    pasteDevelopmentSettings: new PasteDevelopmentSettings(developmentSettingsClipboard),
    saveProject: new SaveProject(projects),
    suggestPhotoTags: new SuggestPhotoTags(semanticSegmentationModel),
    suggestAutomaticEnhancement: new SuggestAutomaticEnhancement(),
    deleteProject: new DeleteProject(projects, sourceFiles, projectAssetJournal, projectAssetQueue),
    decideAiDevelopmentAdvice: new DecideAiDevelopmentAdvice(),
    duplicateProject: new DuplicateProject(projects, sourceFiles, projectAssetJournal, projectAssetQueue),
    estimateHorizon: new EstimateHorizon(new BrowserHorizonEstimator()),
    sourceFiles,
    projectExporter: bundle,
    projectImporter: bundle,
    configureAi: new ConfigureAi(aiCredentialVault, googleDrive),
    inspectAiConfiguration: new InspectAiConfiguration(aiCredentialVault),
    unlockAi: new UnlockAi(aiCredentialVault),
    removeAi: new RemoveAi(aiCredentialVault),
    removeAiFromAccount: new RemoveAiFromAccount(googleDrive),
    restoreAiFromAccount: new RestoreAiFromAccount(googleDrive, aiCredentialVault),
    manageCloudStorage: new ManageCloudStorage(googleDrive),
    persistentStorage: new PersistentStorageRequest(),
    renderProjectPreview: new RenderProjectPreview(previewRenderer),
    renderProjectBaseline: new RenderProjectBaseline(previewRenderer),
    requestEditingAdvice: new RequestEditingAdvice(new OpenAiEditingAdvisor(openAi, new OpenAiEditProposalMapper())),
    recordAiDevelopmentAdvice: new RecordAiDevelopmentAdvice(),
    requestPhotoOpinion: new RequestPhotoOpinion(new OpenAiPhotoOpinionAdvisor(openAi)),
    reviewDevelopment: new ReviewDevelopment(new LocalDevelopmentTutor()),
    reviewImportCandidates: new ReviewImportCandidates(sourceImageInspector, new OpenAiImportCandidateReviewer(openAi)),
    reconcileProjectAssets: new ReconcileProjectAssets(projects, sourceFiles, projectAssetJournal, projectAssetQueue),
    exportProjectPhoto: new ExportProjectPhoto(new WorkerPhotoExporter(sourceFiles, exportSourceDecoder)),
    exportProjectSidecar: new ExportProjectSidecar(projectSidecarCodec),
    inspectSourceImage: new InspectSourceImage(sourceImageInspector)
  };
}
