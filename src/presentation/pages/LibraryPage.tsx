import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Queue, QueueOptions } from '@haskou/flow';
import { ApplyEditOperationMessage } from '@/contexts/projects/application/apply-edit-operation/messages/ApplyEditOperationMessage';
import { AssessImportCapacityMessage } from '@/contexts/projects/application/assess-import-capacity/messages/AssessImportCapacityMessage';
import type { ImportCapacityAssessment } from '@/contexts/projects/application/assess-import-capacity/AssessImportCapacity';
import { CalibrateRawDisplayMessage } from '@/contexts/projects/application/calibrate-raw-display/messages/CalibrateRawDisplayMessage';
import { CreateProjectMessage } from '@/contexts/projects/application/create-project/messages/CreateProjectMessage';
import { DeleteProjectMessage } from '@/contexts/projects/application/delete-project/messages/DeleteProjectMessage';
import { DuplicateProjectMessage } from '@/contexts/projects/application/duplicate-project/messages/DuplicateProjectMessage';
import { FindProjectMessage } from '@/contexts/projects/application/find-project/messages/FindProjectMessage';
import { InspectSourceImageMessage } from '@/contexts/projects/application/inspect-source-image/messages/InspectSourceImageMessage';
import { ListProjectsMessage } from '@/contexts/projects/application/list-projects/messages/ListProjectsMessage';
import { ReviewImportCandidatesMessage } from '@/contexts/projects/application/review-import-candidates/messages/ReviewImportCandidatesMessage';
import { SuggestPhotoTagsMessage } from '@/contexts/projects/application/suggest-photo-tags/messages/SuggestPhotoTagsMessage';
import type { ReviewedImportCandidate } from '@/contexts/projects/application/review-import-candidates/ReviewImportCandidates';
import type { SourceImageInspection } from '@/contexts/projects/application/ports/SourceImageInspector';
import type { SemanticModelStatus } from '@/contexts/projects/application/ports/SemanticSegmentationModel';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import type { PhotoProjectSummary } from '@/contexts/projects/domain/PhotoProjectSummary';
import { RawDisplayProfile } from '@/contexts/projects/domain/RawDisplayProfile';
import { useApplication } from '../ApplicationContext';
import { AiSettingsDialog } from '../components/AiSettingsDialog';
import { CloudStorageDialog } from '../components/CloudStorageDialog';
import { ProjectThumbnail } from '../components/ProjectThumbnail';
import { ProjectOrganizationControls } from '../components/ProjectOrganizationControls';
import { ImportSelectionDialog } from '../components/ImportSelectionDialog';
import { ImportPhotosDialog } from '../components/ImportPhotosDialog';
import { PwaInstallButton } from '../components/PwaInstallButton';
import { createDemoImageBlob, downloadBlob } from '../lib/browserImages';

type RawJpegPair = { raw: File; cameraReference: File };

function findRawJpegPair(files: File[]): RawJpegPair | null {
  if (files.length !== 2) return null;
  const raw = files.find((file) => /\.arw$/i.test(file.name));
  const cameraReference = files.find((file) => /\.jpe?g$/i.test(file.name));
  if (raw === undefined || cameraReference === undefined) return null;
  const stem = (name: string): string => name.replace(/\.[^.]+$/, '').normalize('NFC').toLocaleLowerCase();
  return stem(raw.name) === stem(cameraReference.name) ? { raw, cameraReference } : null;
}

export function LibraryPage(): ReactElement {
  const application = useApplication();
  const navigate = useNavigate();
  const imageInput = useRef<HTMLInputElement>(null);
  const bundleInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const modelInstallAbort = useRef<AbortController | null>(null);
  const [projectMutationQueue] = useState(() => new Queue(QueueOptions.withConcurrency(1)));
  const [projects, setProjects] = useState<PhotoProjectSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [minimumRating, setMinimumRating] = useState(0);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cloudStorageOpen, setCloudStorageOpen] = useState(false);
  const [storageCapacity, setStorageCapacity] = useState<ImportCapacityAssessment | null>(null);
  const [importCandidates, setImportCandidates] = useState<ReviewedImportCandidate[] | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState(0);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const [imageDropActive, setImageDropActive] = useState(false);
  const [pendingLocalModelImportFiles, setPendingLocalModelImportFiles] = useState<File[] | null>(null);
  const [pendingImportFiles, setPendingImportFiles] = useState<File[] | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [automaticTags, setAutomaticTags] = useState(true);
  const [tagModelStatus, setTagModelStatus] = useState<SemanticModelStatus | 'checking'>('checking');
  const [installingTagModel, setInstallingTagModel] = useState(false);
  const [tagModelProgress, setTagModelProgress] = useState(0);
  const [tagModelMessage, setTagModelMessage] = useState('Automatic tags never upload the photograph.');
  const tagModel = application.manageSemanticSegmentationModel.describe();
  const projectFilter = useMemo(() => new ListProjectsMessage(searchQuery, minimumRating, favoritesOnly), [favoritesOnly, minimumRating, searchQuery]);
  const filteredProjects = useMemo(() => projects.filter((project) => project.matches(
    projectFilter.getQuery(),
    projectFilter.getMinimumRating(),
    projectFilter.shouldListFavoritesOnly()
  )), [projectFilter, projects]);
  const localModelPreparing = tagModelStatus === 'checking' || installingTagModel;

  const refresh = useCallback(async (): Promise<void> => {
    setProjects(await application.listProjects.list(new ListProjectsMessage('', 0)));
  }, [application]);

  const prepareTagModel = useCallback(async (): Promise<void> => {
    if (modelInstallAbort.current !== null) return;
    setTagModelStatus('checking');
    let controller: AbortController | null = null;
    try {
      const status = await application.manageSemanticSegmentationModel.inspect();
      setTagModelStatus(status);
      if (status !== 'not-installed') return;
      controller = new AbortController();
      modelInstallAbort.current = controller;
      setInstallingTagModel(true);
      setTagModelProgress(0);
      setTagModelMessage('Downloading and verifying the local tagging model automatically…');
      await application.manageSemanticSegmentationModel.install({ signal: controller.signal, onProgress: setTagModelProgress });
      setTagModelStatus('installed');
      setAutomaticTags(true);
      setTagModelProgress(1);
      setTagModelMessage('Local model ready. New imports will be tagged automatically.');
    } catch (caught: unknown) {
      const status = await application.manageSemanticSegmentationModel.inspect().catch(() => 'unavailable' as const);
      setTagModelStatus(status);
      setTagModelMessage(caught instanceof DOMException && caught.name === 'AbortError'
        ? 'The local model continues preparing in the background.'
        : caught instanceof Error ? `${caught.message} You can retry from the import dialog.` : 'The local tag model could not be prepared.');
    } finally {
      if (modelInstallAbort.current === controller) {
        modelInstallAbort.current = null;
        setInstallingTagModel(false);
      }
    }
  }, [application]);

  useEffect(() => {
    void application.reconcileProjectAssets.reconcile().then(async (result) => {
      await refresh();
      if (result.recoveredMutations > 0) setRecoveryMessage(`Recovered ${result.recoveredMutations} interrupted local ${result.recoveredMutations === 1 ? 'operation' : 'operations'}${result.removedOrphanedSources > 0 ? ` and removed ${result.removedOrphanedSources} orphaned original ${result.removedOrphanedSources === 1 ? 'file' : 'files'}` : ''}.`);
      if (result.missingReferencedSources > 0) setError(`${result.missingReferencedSources} project ${result.missingReferencedSources === 1 ? 'references a missing original' : 'reference missing originals'}. Export its recipe and restore the source from backup.`);
    }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Interrupted local operations could not be reconciled.'));
    void application.assessImportCapacity.assess(new AssessImportCapacityMessage(1)).then(setStorageCapacity);
  }, [application, refresh]);

  useEffect(() => {
    void prepareTagModel();
    return () => {
      const controller = modelInstallAbort.current;
      modelInstallAbort.current = null;
      controller?.abort();
    };
  }, [prepareTagModel]);

  const persistImportedFile = useCallback(async (
    file: File,
    inspection: SourceImageInspection,
    cameraReference: File | null = null
  ): Promise<void> => {
      const capacity = await application.assessImportCapacity.assess(new AssessImportCapacityMessage(file.size));
      setStorageCapacity(capacity);
      if (!capacity.canImport) {
        throw new Error(`This original needs ${formatBytes(file.size)}, but RAWcket is preserving ${formatBytes(capacity.safetyReserveBytes)} as a safety reserve. Free browser storage or export and remove older projects first.`);
      }
      const normalizedFile = new File([file], file.name, { type: inspection.mimeType });
      let suggestedTags: string[] = [];
      if (automaticTags && await application.manageSemanticSegmentationModel.inspect() === 'installed') {
        setTagModelMessage('Analyzing the selected photograph locally…');
        const controller = new AbortController();
        try {
          suggestedTags = await application.suggestPhotoTags.suggest(
            new SuggestPhotoTagsMessage(inspection.embeddedPreview ?? normalizedFile),
            { signal: controller.signal, onProgress: setTagModelProgress }
          );
          setTagModelMessage(suggestedTags.length === 0 ? 'No supported local tags were found.' : `Local tags: ${suggestedTags.join(', ')}.`);
        } catch (caught: unknown) {
          setTagModelMessage(caught instanceof Error ? `Imported without automatic tags: ${caught.message}` : 'Imported without automatic tags.');
        }
      }
      const name = file.name.replace(/\.(jpe?g|png|arw)$/i, '') || 'Untitled project';
      let displayProfile = RawDisplayProfile.neutral().toPrimitives();
      if (inspection.mimeType === 'image/x-sony-arw' && cameraReference !== null) {
        setTagModelMessage('Matching RAW color and tone to the camera JPEG…');
        const normalizedReference = new File([cameraReference], cameraReference.name, { type: 'image/jpeg' });
        displayProfile = await application.calibrateRawDisplay.calibrate(
          new CalibrateRawDisplayMessage(normalizedFile, normalizedReference)
        );
        setTagModelMessage('Camera JPEG matched. The RAW remains the editable original.');
      }
      const project = await application.createProject.create(
        new CreateProjectMessage(
          name,
          normalizedFile,
          file.name,
          inspection.width,
          inspection.height,
          inspection.captureMetadata,
          displayProfile
        )
      );
      if (suggestedTags.length > 0) {
        application.applyEditOperation.apply(project, new ApplyEditOperationMessage(project.getId().valueOf(), {
          kind: EDIT_OPERATION.SET_PROJECT_TAGS,
          tags: suggestedTags,
          groupId: null
        }));
        await application.saveProject.save(project);
      }
      void application.persistentStorage.request();
      await refresh();
      void navigate(`/editor/${project.getId().valueOf()}`);
  }, [application, automaticTags, navigate, refresh]);

  const createFromFile = useCallback(async (
    file: File,
    inspection?: SourceImageInspection,
    cameraReference: File | null = null
  ): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await persistImportedFile(
        file,
        inspection ?? await application.inspectSourceImage.inspect(new InspectSourceImageMessage(file, file.name)),
        cameraReference
      );
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'The image could not be imported.');
    } finally {
      setBusy(false);
    }
  }, [application, persistImportedFile]);

  const onImage = (event: ChangeEvent<HTMLInputElement>): void => {
    setImportDialogOpen(false);
    importImages([...event.target.files ?? []]);
    event.target.value = '';
  };

  const importImages = (files: File[]): void => {
    if (files.length === 0) return;
    if (localModelPreparing) {
      setPendingLocalModelImportFiles(files);
      setImportDialogOpen(true);
      setTagModelMessage(`Local AI is still downloading · ${Math.round(tagModelProgress * 100)}%. Your selection is held and import will continue when preparation finishes.`);
      return;
    }
    setImportDialogOpen(false);
    const pair = findRawJpegPair(files);
    if (pair !== null) {
      void createFromFile(pair.raw, undefined, pair.cameraReference);
      return;
    }
    if (files.length === 1 && files[0] !== undefined) void createFromFile(files[0]);
    if (files.length > 1) void reviewImportCandidates(files);
  };

  const openImportDialog = (): void => {
    setImportDialogOpen(true);
    if (tagModelStatus === 'not-installed' && !installingTagModel) void prepareTagModel();
  };

  const dragImagesIntoLibrary = (event: DragEvent<HTMLElement>): void => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepth.current += 1;
    event.dataTransfer.dropEffect = busy || localModelPreparing ? 'none' : 'copy';
    setImageDropActive(true);
  };

  const dragImagesOverLibrary = (event: DragEvent<HTMLElement>): void => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = busy || localModelPreparing ? 'none' : 'copy';
  };

  const dragImagesOutOfLibrary = (event: DragEvent<HTMLElement>): void => {
    if (!event.dataTransfer.types.includes('Files')) return;
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setImageDropActive(false);
  };

  const dropImagesIntoLibrary = (event: DragEvent<HTMLElement>): void => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepth.current = 0;
    setImageDropActive(false);
    if (busy || localModelPreparing) return;
    importImages([...event.dataTransfer.files]);
  };

  const reviewImportCandidates = useCallback(async (files: File[]): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const configuration = await application.inspectAiConfiguration.inspect();
      if (!configuration.ready) {
        setPendingImportFiles(files);
        setSettingsOpen(true);
        setError('Configure OpenAI API to compare these photographs by their post-edit potential. Your selection is being held.');
        return;
      }
      const reviewed = await application.reviewImportCandidates.review(new ReviewImportCandidatesMessage(files));
      setImportCandidates(reviewed);
      setSelectedCandidate(0);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'The selected photographs could not be compared.');
    } finally {
      setBusy(false);
    }
  }, [application]);

  useEffect(() => {
    if (localModelPreparing || pendingLocalModelImportFiles === null) return;
    const files = pendingLocalModelImportFiles;
    setPendingLocalModelImportFiles(null);
    setImportDialogOpen(false);
    const pair = findRawJpegPair(files);
    if (pair !== null) void createFromFile(pair.raw, undefined, pair.cameraReference);
    else if (files.length === 1 && files[0] !== undefined) void createFromFile(files[0]);
    else if (files.length > 1) void reviewImportCandidates(files);
  }, [createFromFile, localModelPreparing, pendingLocalModelImportFiles, reviewImportCandidates]);

  const continuePendingImport = (): void => {
    const files = pendingImportFiles;
    setPendingImportFiles(null);
    setError(null);
    if (files !== null) void reviewImportCandidates(files);
  };

  const continueWithCandidate = (): void => {
    const candidate = importCandidates?.[selectedCandidate];
    if (candidate === undefined) return;
    setImportCandidates(null);
    void createFromFile(candidate.file, candidate.inspection);
  };

  const createDemo = async (): Promise<void> => {
    const blob = await createDemoImageBlob();
    await createFromFile(new File([blob], 'Horizonte RAWcket.jpg', { type: 'image/jpeg' }));
  };

  const rename = async (summary: PhotoProjectSummary): Promise<void> => {
    const name = window.prompt('New project name', summary.getName().valueOf());
    if (name === null) return;
    const project = await application.findProject.find(new FindProjectMessage(summary.getId().valueOf()));
    if (project === null) return;
    application.applyEditOperation.apply(project, new ApplyEditOperationMessage(project.getId().valueOf(), {
      kind: EDIT_OPERATION.RENAME_PROJECT,
      name,
      groupId: null
    }));
    await application.saveProject.save(project);
    await refresh();
  };

  const changeRating = async (summary: PhotoProjectSummary, rating: number): Promise<void> => {
    await projectMutationQueue.run(async () => {
      const project = await application.findProject.find(new FindProjectMessage(summary.getId().valueOf()));
      if (project === null) return;
      try {
        application.applyEditOperation.apply(project, new ApplyEditOperationMessage(project.getId().valueOf(), {
          kind: EDIT_OPERATION.SET_PROJECT_RATING,
          rating,
          groupId: null
        }));
        await application.saveProject.save(project);
        await refresh();
      } catch (caught: unknown) {
        setError(caught instanceof Error ? caught.message : 'The project rating could not be changed.');
      }
    });
  };

  const changeTags = async (summary: PhotoProjectSummary, tags: string[]): Promise<void> => {
    await projectMutationQueue.run(async () => {
      const project = await application.findProject.find(new FindProjectMessage(summary.getId().valueOf()));
      if (project === null) return;
      try {
        application.applyEditOperation.apply(project, new ApplyEditOperationMessage(project.getId().valueOf(), {
          kind: EDIT_OPERATION.SET_PROJECT_TAGS,
          tags,
          groupId: null
        }));
        await application.saveProject.save(project);
        await refresh();
      } catch (caught: unknown) {
        setError(caught instanceof Error ? caught.message : 'The project tags could not be changed.');
      }
    });
  };

  const changeFavorite = async (summary: PhotoProjectSummary, favorite: boolean): Promise<void> => {
    await projectMutationQueue.run(async () => {
      const project = await application.findProject.find(new FindProjectMessage(summary.getId().valueOf()));
      if (project === null) return;
      try {
        application.applyEditOperation.apply(project, new ApplyEditOperationMessage(project.getId().valueOf(), { kind: EDIT_OPERATION.SET_PROJECT_FAVORITE, favorite, groupId: null }));
        await application.saveProject.save(project);
        await refresh();
      } catch (caught: unknown) {
        setError(caught instanceof Error ? caught.message : 'The project favorite could not be changed.');
      }
    });
  };

  const duplicate = async (id: string): Promise<void> => {
    await application.duplicateProject.duplicate(new DuplicateProjectMessage(id));
    await refresh();
  };

  const remove = async (summary: PhotoProjectSummary): Promise<void> => {
    if (!window.confirm(`Delete “${summary.getName().valueOf()}” and its local original?`)) return;
    await application.deleteProject.delete(new DeleteProjectMessage(summary.getId().valueOf()));
    await refresh();
  };

  const exportProject = async (summary: PhotoProjectSummary): Promise<void> => {
    const bundle = await application.projectExporter.exportProject(summary.getId());
    const safeName = summary.getName().valueOf().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '');
    downloadBlob(bundle, `${safeName || 'project'}.rawcket`);
  };

  const importBundle = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    setBusy(true);
    try {
      const id = await application.projectImporter.importProject(file);
      await refresh();
      void navigate(`/editor/${id.valueOf()}`);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'The project bundle could not be imported.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  return (
    <main
      className="library-shell"
      onDragEnter={dragImagesIntoLibrary}
      onDragOver={dragImagesOverLibrary}
      onDragLeave={dragImagesOutOfLibrary}
      onDrop={dropImagesIntoLibrary}
    >
      {imageDropActive && (
        <div className={`library-drop-overlay ${busy || localModelPreparing ? 'blocked' : ''}`} role="status" aria-live="polite">
          <span className="drop-target-icon" aria-hidden="true">↓</span>
          <strong>{installingTagModel ? `Preparing Local AI · ${Math.round(tagModelProgress * 100)}%` : busy ? 'Finish the current import first' : 'Drop photographs to import'}</strong>
          <small>{installingTagModel ? 'Import unlocks as soon as the verified local tagging model is ready.' : busy ? 'RAWcket is already processing a photograph.' : 'JPEG, PNG, or Sony ARW · drop several to compare them first'}</small>
        </div>
      )}
      <header className="library-header">
        <a className="brand" href="/" aria-label="RAWcket library"><span className="brand-mark">R</span><span>RAWcket</span></a>
        <nav className="library-navigation" aria-label="Library sections">
          <a className="active" href="/">Library</a>
        </nav>
        <label className="library-header-search">
          <span className="visually-hidden">Search projects</span>
          <span aria-hidden="true">⌕</span>
          <input type="search" value={searchQuery} placeholder="Search photographs" onChange={(event) => setSearchQuery(event.target.value)} />
        </label>
        <div className="header-actions">
          {installingTagModel && <div className="local-model-header-progress" role="status" aria-live="polite"><span className="mini-spinner" aria-hidden="true" /><span>Local AI · {Math.round(tagModelProgress * 100)}%</span></div>}
          <details className="library-more-menu">
            <summary role="button" aria-label="Library menu" title="Library menu">•••</summary>
            <div>
              <button type="button" onClick={() => setCloudStorageOpen(true)}>Sync &amp; Google Drive</button>
              <button type="button" onClick={() => setSettingsOpen(true)}>AI settings</button>
              <button type="button" onClick={() => bundleInput.current?.click()}>Import RAWcket project</button>
              <PwaInstallButton />
            </div>
          </details>
          <button className="button primary" type="button" onClick={openImportDialog} disabled={busy || localModelPreparing}>{localModelPreparing ? `Local AI ${Math.round(tagModelProgress * 100)}%` : busy ? 'Importing…' : 'Import'}</button>
        </div>
      </header>
      <input ref={imageInput} className="visually-hidden" type="file" multiple accept="image/jpeg,image/png,.arw,image/x-sony-arw" onChange={onImage} aria-label="Select one or more JPEG, PNG, or Sony ARW images" />
      <input ref={bundleInput} className="visually-hidden" type="file" accept=".rawcket,application/zip" onChange={(event) => void importBundle(event)} aria-label="Select a RAWcket project" />
      {error !== null && <p className="notice error" role="alert">{error}</p>}
      {recoveryMessage !== null && <p className="notice" role="status">{recoveryMessage}</p>}
      <section className="library-content" aria-labelledby="projects-title">
        <div className="section-heading"><div><h1 id="projects-title">Library</h1><span>{filteredProjects.length} of {projects.length} {projects.length === 1 ? 'photograph' : 'photographs'}</span></div></div>
        {projects.length > 0 && <div className="library-filters" role="search">
          <label><span>Minimum rating</span><select value={minimumRating} onChange={(event) => setMinimumRating(Number(event.target.value))}>
            <option value={0}>All ratings</option>
            <option value={1}>★ and above</option>
            <option value={2}>★★ and above</option>
            <option value={3}>★★★ and above</option>
            <option value={4}>★★★★ and above</option>
            <option value={5}>★★★★★ only</option>
          </select></label>
          <label className="favorite-filter"><input type="checkbox" checked={favoritesOnly} onChange={(event) => setFavoritesOnly(event.target.checked)} /> Favorites only</label>
          {(searchQuery.length > 0 || minimumRating > 0 || favoritesOnly) && <button type="button" onClick={() => { setSearchQuery(''); setMinimumRating(0); setFavoritesOnly(false); }}>Clear filters</button>}
        </div>}
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">+</div>
            <h2>Import your first photograph</h2>
            <p>Drop JPEG, PNG, or Sony ARW files anywhere in this window, or choose them from disk.</p>
            <div className="empty-state-actions">
              <button className="button primary" type="button" onClick={openImportDialog} disabled={localModelPreparing}>{localModelPreparing ? `Preparing Local AI · ${Math.round(tagModelProgress * 100)}%` : 'Choose photographs'}</button>
              <button className="button ghost" type="button" onClick={() => void createDemo()}>Open demo</button>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state compact">
            <h3>No matching projects</h3>
            <p>Try another name, tag, or rating.</p>
            <button className="button ghost" type="button" onClick={() => { setSearchQuery(''); setMinimumRating(0); setFavoritesOnly(false); }}>Clear filters</button>
          </div>
        ) : (
          <div className="project-grid">
            {filteredProjects.map((project) => {
              const id = project.getId().valueOf();
              const name = project.getName().valueOf();
              return (
                <article className="project-card" key={id}>
                  <details className="project-menu">
                    <summary role="button" aria-label={`Actions for ${name}`} title={`Actions for ${name}`}>•••</summary>
                    <div>
                      <button type="button" onClick={() => void rename(project)}>Rename</button>
                      <button type="button" onClick={() => void duplicate(id)}>Duplicate</button>
                      <button type="button" onClick={() => void exportProject(project)}>Export project</button>
                      <button className="danger-text" type="button" onClick={() => void remove(project)}>Delete</button>
                    </div>
                  </details>
                  <button className="project-open" type="button" onClick={() => void navigate(`/editor/${id}`)} aria-label={`Open ${name}`}>
                    <ProjectThumbnail projectId={id} name={name} mimeType={project.getSourceMimeType().valueOf()} />
                    <span className="project-meta"><strong>{name}</strong><small>Edited {project.getUpdatedAt().toDate().toLocaleString('en')}</small></span>
                  </button>
                  <ProjectOrganizationControls project={project} onRate={(rating) => void changeRating(project, rating)} onTags={(tags) => void changeTags(project, tags)} onFavorite={(favorite) => void changeFavorite(project, favorite)} />
                </article>
              );
            })}
          </div>
        )}
      </section>
      <footer className="library-status-bar">
        <span>Local library</span>
        {storageCapacity?.supported === true && <span>{formatBytes(storageCapacity.usageBytes)} of {formatBytes(storageCapacity.quotaBytes)} used · {storageCapacity.persistent ? 'protected storage' : 'browser-managed storage'}</span>}
      </footer>
      <AiSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} onConfigured={continuePendingImport} />
      <CloudStorageDialog open={cloudStorageOpen} onClose={() => setCloudStorageOpen(false)} />
      <ImportPhotosDialog
        open={importDialogOpen}
        busy={busy}
        automaticTags={automaticTags}
        model={tagModel}
        modelStatus={tagModelStatus}
        installingModel={installingTagModel}
        modelProgress={tagModelProgress}
        modelMessage={tagModelMessage}
        onClose={() => setImportDialogOpen(false)}
        onBrowse={() => imageInput.current?.click()}
        onFiles={importImages}
        onAutomaticTagsChange={setAutomaticTags}
        onInstallModel={() => void prepareTagModel()}
      />
      {importCandidates !== null && <ImportSelectionDialog candidates={importCandidates} selected={selectedCandidate} onSelect={setSelectedCandidate} onCancel={() => setImportCandidates(null)} onContinue={continueWithCandidate} />}
    </main>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
