import { ApplyEditOperation } from '@/contexts/projects/application/apply-edit-operation/ApplyEditOperation';
import { ApplyProjectSidecar } from '@/contexts/projects/application/apply-project-sidecar/ApplyProjectSidecar';
import { AssessImportCapacity } from '@/contexts/projects/application/assess-import-capacity/AssessImportCapacity';
import { ChangeHistory } from '@/contexts/projects/application/change-history/ChangeHistory';
import { ChooseInterfaceMode } from '@/contexts/projects/application/choose-interface-mode/ChooseInterfaceMode';
import { CopyDevelopmentSettings } from '@/contexts/projects/application/copy-development-settings/CopyDevelopmentSettings';
import { CreateProject } from '@/contexts/projects/application/create-project/CreateProject';
import { CreateSemanticMask } from '@/contexts/projects/application/create-semantic-mask/CreateSemanticMask';
import { DeleteProject } from '@/contexts/projects/application/delete-project/DeleteProject';
import { DuplicateProject } from '@/contexts/projects/application/duplicate-project/DuplicateProject';
import { ExportProjectPhoto } from '@/contexts/projects/application/export-project-photo/ExportProjectPhoto';
import { ExportProjectSidecar } from '@/contexts/projects/application/export-project-sidecar/ExportProjectSidecar';
import { FindProject } from '@/contexts/projects/application/find-project/FindProject';
import { ListProjects } from '@/contexts/projects/application/list-projects/ListProjects';
import { ManageSemanticSegmentationModel } from '@/contexts/projects/application/manage-semantic-segmentation-model/ManageSemanticSegmentationModel';
import { InspectSourceImage } from '@/contexts/projects/application/inspect-source-image/InspectSourceImage';
import { SaveProject } from '@/contexts/projects/application/save-project/SaveProject';
import { RenderProjectPreview } from '@/contexts/projects/application/render-project-preview/RenderProjectPreview';
import { RequestEditingAdvice } from '@/contexts/projects/application/request-editing-advice/RequestEditingAdvice';
import { ReviewDevelopment } from '@/contexts/projects/application/review-development/ReviewDevelopment';
import { ReviewImportCandidates } from '@/contexts/projects/application/review-import-candidates/ReviewImportCandidates';
import { PasteDevelopmentSettings } from '@/contexts/projects/application/paste-development-settings/PasteDevelopmentSettings';
import type { ProjectExporter } from '@/contexts/projects/application/ports/ProjectExporter';
import type { ProjectImporter } from '@/contexts/projects/application/ports/ProjectImporter';
import type { SourceFileRepository } from '@/contexts/projects/domain/repositories/SourceFileRepository';
import { RawcketProjectBundle } from '@/contexts/projects/infrastructure/bundles/RawcketProjectBundle';
import { BrowserSourceImageInspector } from '@/contexts/projects/infrastructure/codecs/BrowserSourceImageInspector';
import { ProjectMigrator } from '@/contexts/projects/infrastructure/migrations/ProjectMigrator';
import { VersionZeroToOneProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionZeroToOneProjectMigration';
import { VersionOneToTwoProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionOneToTwoProjectMigration';
import { VersionTwoToThreeProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionTwoToThreeProjectMigration';
import { VersionThreeToFourProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionThreeToFourProjectMigration';
import { VersionFourToFiveProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionFourToFiveProjectMigration';
import { VersionFiveToSixProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionFiveToSixProjectMigration';
import { BrowserSourceFileRepository } from '@/contexts/projects/infrastructure/repositories/BrowserSourceFileRepository';
import { IndexedDbProjectRepository } from '@/contexts/projects/infrastructure/repositories/IndexedDbProjectRepository';
import { WorkerPreviewRenderer } from '@/contexts/projects/infrastructure/renderers/WorkerPreviewRenderer';
import { CachingPreviewRenderer } from '@/contexts/projects/infrastructure/renderers/CachingPreviewRenderer';
import { WorkerPhotoExporter } from '@/contexts/projects/infrastructure/renderers/WorkerPhotoExporter';
import { LocalRecipeAdvisor } from '@/contexts/projects/infrastructure/advisors/LocalRecipeAdvisor';
import { LocalDevelopmentTutor } from '@/contexts/projects/infrastructure/advisors/LocalDevelopmentTutor';
import { BrowserImportCandidateReviewer } from '@/contexts/projects/infrastructure/advisors/BrowserImportCandidateReviewer';
import { BrowserSemanticSegmentationModel } from '@/contexts/projects/infrastructure/ai/BrowserSemanticSegmentationModel';
import { BrowserDevelopmentSettingsClipboard } from '@/contexts/projects/infrastructure/clipboard/BrowserDevelopmentSettingsClipboard';
import { JsonProjectSidecarCodec } from '@/contexts/projects/infrastructure/sidecars/JsonProjectSidecarCodec';
import { RawcketDatabase } from '@/shared/infrastructure/database/RawcketDatabase';
import { BrowserApiKeyVault } from '@/shared/infrastructure/security/BrowserApiKeyVault';
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
  applyEditOperation: ApplyEditOperation;
  applyProjectSidecar: ApplyProjectSidecar;
  changeHistory: ChangeHistory;
  chooseInterfaceMode: ChooseInterfaceMode;
  copyDevelopmentSettings: CopyDevelopmentSettings;
  pasteDevelopmentSettings: PasteDevelopmentSettings;
  saveProject: SaveProject;
  deleteProject: DeleteProject;
  duplicateProject: DuplicateProject;
  sourceFiles: SourceFileRepository;
  projectExporter: ProjectExporter;
  projectImporter: ProjectImporter;
  apiKeyVault: BrowserApiKeyVault;
  persistentStorage: PersistentStorageRequest;
  renderProjectPreview: RenderProjectPreview;
  requestEditingAdvice: RequestEditingAdvice;
  reviewDevelopment: ReviewDevelopment;
  reviewImportCandidates: ReviewImportCandidates;
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
    new VersionFiveToSixProjectMigration()
  ]);
  const projects = new IndexedDbProjectRepository(database, migrator);
  const sourceFiles = new BrowserSourceFileRepository(database);
  const bundle = new RawcketProjectBundle(projects, sourceFiles, migrator);
  const settings = new RawcketSettingsRepository(database);
  const previewRenderer = new CachingPreviewRenderer(new WorkerPreviewRenderer(sourceFiles));
  const developmentSettingsClipboard = new BrowserDevelopmentSettingsClipboard();
  const semanticSegmentationModel = new BrowserSemanticSegmentationModel();
  const sourceImageInspector = new BrowserSourceImageInspector();
  const projectSidecarCodec = new JsonProjectSidecarCodec();
  return {
    createProject: new CreateProject(projects, sourceFiles),
    createSemanticMask: new CreateSemanticMask(semanticSegmentationModel),
    assessImportCapacity: new AssessImportCapacity(new BrowserLocalStorageInspector()),
    findProject: new FindProject(projects),
    listProjects: new ListProjects(projects),
    manageSemanticSegmentationModel: new ManageSemanticSegmentationModel(semanticSegmentationModel),
    applyEditOperation: new ApplyEditOperation(),
    applyProjectSidecar: new ApplyProjectSidecar(projectSidecarCodec),
    changeHistory: new ChangeHistory(),
    chooseInterfaceMode: new ChooseInterfaceMode(),
    copyDevelopmentSettings: new CopyDevelopmentSettings(developmentSettingsClipboard),
    pasteDevelopmentSettings: new PasteDevelopmentSettings(developmentSettingsClipboard),
    saveProject: new SaveProject(projects),
    deleteProject: new DeleteProject(projects, sourceFiles),
    duplicateProject: new DuplicateProject(projects, sourceFiles),
    sourceFiles,
    projectExporter: bundle,
    projectImporter: bundle,
    apiKeyVault: new BrowserApiKeyVault(settings),
    persistentStorage: new PersistentStorageRequest(),
    renderProjectPreview: new RenderProjectPreview(previewRenderer),
    requestEditingAdvice: new RequestEditingAdvice(new LocalRecipeAdvisor()),
    reviewDevelopment: new ReviewDevelopment(new LocalDevelopmentTutor()),
    reviewImportCandidates: new ReviewImportCandidates(sourceImageInspector, new BrowserImportCandidateReviewer()),
    exportProjectPhoto: new ExportProjectPhoto(new WorkerPhotoExporter(sourceFiles)),
    exportProjectSidecar: new ExportProjectSidecar(projectSidecarCodec),
    inspectSourceImage: new InspectSourceImage(sourceImageInspector)
  };
}
