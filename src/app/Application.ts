import { ApplyEditOperation } from '@/contexts/projects/application/apply-edit-operation/ApplyEditOperation';
import { ChangeHistory } from '@/contexts/projects/application/change-history/ChangeHistory';
import { ChooseInterfaceMode } from '@/contexts/projects/application/choose-interface-mode/ChooseInterfaceMode';
import { CreateProject } from '@/contexts/projects/application/create-project/CreateProject';
import { DeleteProject } from '@/contexts/projects/application/delete-project/DeleteProject';
import { DuplicateProject } from '@/contexts/projects/application/duplicate-project/DuplicateProject';
import { ExportProjectPhoto } from '@/contexts/projects/application/export-project-photo/ExportProjectPhoto';
import { FindProject } from '@/contexts/projects/application/find-project/FindProject';
import { ListProjects } from '@/contexts/projects/application/list-projects/ListProjects';
import { InspectSourceImage } from '@/contexts/projects/application/inspect-source-image/InspectSourceImage';
import { SaveProject } from '@/contexts/projects/application/save-project/SaveProject';
import { RenderProjectPreview } from '@/contexts/projects/application/render-project-preview/RenderProjectPreview';
import { RequestEditingAdvice } from '@/contexts/projects/application/request-editing-advice/RequestEditingAdvice';
import type { ProjectExporter } from '@/contexts/projects/application/ports/ProjectExporter';
import type { ProjectImporter } from '@/contexts/projects/application/ports/ProjectImporter';
import type { SourceFileRepository } from '@/contexts/projects/domain/repositories/SourceFileRepository';
import { RawcketProjectBundle } from '@/contexts/projects/infrastructure/bundles/RawcketProjectBundle';
import { BrowserSourceImageInspector } from '@/contexts/projects/infrastructure/codecs/BrowserSourceImageInspector';
import { ProjectMigrator } from '@/contexts/projects/infrastructure/migrations/ProjectMigrator';
import { VersionZeroToOneProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionZeroToOneProjectMigration';
import { VersionOneToTwoProjectMigration } from '@/contexts/projects/infrastructure/migrations/VersionOneToTwoProjectMigration';
import { BrowserSourceFileRepository } from '@/contexts/projects/infrastructure/repositories/BrowserSourceFileRepository';
import { IndexedDbProjectRepository } from '@/contexts/projects/infrastructure/repositories/IndexedDbProjectRepository';
import { WorkerPreviewRenderer } from '@/contexts/projects/infrastructure/renderers/WorkerPreviewRenderer';
import { WorkerPhotoExporter } from '@/contexts/projects/infrastructure/renderers/WorkerPhotoExporter';
import { LocalRecipeAdvisor } from '@/contexts/projects/infrastructure/advisors/LocalRecipeAdvisor';
import { RawcketDatabase } from '@/shared/infrastructure/database/RawcketDatabase';
import { BrowserApiKeyVault } from '@/shared/infrastructure/security/BrowserApiKeyVault';
import { RawcketSettingsRepository } from '@/shared/infrastructure/settings/RawcketSettingsRepository';
import { PersistentStorageRequest } from '@/shared/infrastructure/storage/PersistentStorageRequest';

export type Application = {
  createProject: CreateProject;
  findProject: FindProject;
  listProjects: ListProjects;
  applyEditOperation: ApplyEditOperation;
  changeHistory: ChangeHistory;
  chooseInterfaceMode: ChooseInterfaceMode;
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
  exportProjectPhoto: ExportProjectPhoto;
  inspectSourceImage: InspectSourceImage;
};

export function createApplication(databaseName = 'rawcket'): Application {
  const database = RawcketDatabase.open(databaseName);
  const migrator = new ProjectMigrator([
    new VersionZeroToOneProjectMigration(),
    new VersionOneToTwoProjectMigration()
  ]);
  const projects = new IndexedDbProjectRepository(database, migrator);
  const sourceFiles = new BrowserSourceFileRepository(database);
  const bundle = new RawcketProjectBundle(projects, sourceFiles, migrator);
  const settings = new RawcketSettingsRepository(database);
  const previewRenderer = new WorkerPreviewRenderer(sourceFiles);
  return {
    createProject: new CreateProject(projects, sourceFiles),
    findProject: new FindProject(projects),
    listProjects: new ListProjects(projects),
    applyEditOperation: new ApplyEditOperation(),
    changeHistory: new ChangeHistory(),
    chooseInterfaceMode: new ChooseInterfaceMode(),
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
    exportProjectPhoto: new ExportProjectPhoto(new WorkerPhotoExporter(sourceFiles)),
    inspectSourceImage: new InspectSourceImage(new BrowserSourceImageInspector())
  };
}
