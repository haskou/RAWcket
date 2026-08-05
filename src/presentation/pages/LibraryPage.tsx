import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { Queue, QueueOptions } from '@haskou/flow';
import { ApplyEditOperationMessage } from '@/contexts/projects/application/apply-edit-operation/messages/ApplyEditOperationMessage';
import { AssessImportCapacityMessage } from '@/contexts/projects/application/assess-import-capacity/messages/AssessImportCapacityMessage';
import type { ImportCapacityAssessment } from '@/contexts/projects/application/assess-import-capacity/AssessImportCapacity';
import { CreateProjectMessage } from '@/contexts/projects/application/create-project/messages/CreateProjectMessage';
import { DeleteProjectMessage } from '@/contexts/projects/application/delete-project/messages/DeleteProjectMessage';
import { DuplicateProjectMessage } from '@/contexts/projects/application/duplicate-project/messages/DuplicateProjectMessage';
import { FindProjectMessage } from '@/contexts/projects/application/find-project/messages/FindProjectMessage';
import { InspectSourceImageMessage } from '@/contexts/projects/application/inspect-source-image/messages/InspectSourceImageMessage';
import { ListProjectsMessage } from '@/contexts/projects/application/list-projects/messages/ListProjectsMessage';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import type { PhotoProjectSummary } from '@/contexts/projects/domain/PhotoProjectSummary';
import { useApplication } from '../ApplicationContext';
import { AiSettingsDialog } from '../components/AiSettingsDialog';
import { ProjectThumbnail } from '../components/ProjectThumbnail';
import { ProjectOrganizationControls } from '../components/ProjectOrganizationControls';
import { createDemoImageBlob, downloadBlob } from '../lib/browserImages';

export function LibraryPage(): ReactElement {
  const application = useApplication();
  const navigate = useNavigate();
  const imageInput = useRef<HTMLInputElement>(null);
  const bundleInput = useRef<HTMLInputElement>(null);
  const [projectMutationQueue] = useState(() => new Queue(QueueOptions.withConcurrency(1)));
  const [projects, setProjects] = useState<PhotoProjectSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [minimumRating, setMinimumRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storageCapacity, setStorageCapacity] = useState<ImportCapacityAssessment | null>(null);
  const projectFilter = useMemo(() => new ListProjectsMessage(searchQuery, minimumRating), [minimumRating, searchQuery]);
  const filteredProjects = useMemo(() => projects.filter((project) => project.matches(
    projectFilter.getQuery(),
    projectFilter.getMinimumRating()
  )), [projectFilter, projects]);

  const refresh = useCallback(async (): Promise<void> => {
    setProjects(await application.listProjects.list(new ListProjectsMessage('', 0)));
  }, [application]);

  useEffect(() => {
    void refresh();
    void application.assessImportCapacity.assess(new AssessImportCapacityMessage(1)).then(setStorageCapacity);
  }, [application, refresh]);

  const createFromFile = async (file: File): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const capacity = await application.assessImportCapacity.assess(new AssessImportCapacityMessage(file.size));
      setStorageCapacity(capacity);
      if (!capacity.canImport) {
        throw new Error(`This original needs ${formatBytes(file.size)}, but RAWcket is preserving ${formatBytes(capacity.safetyReserveBytes)} as a safety reserve. Free browser storage or export and remove older projects first.`);
      }
      const inspection = await application.inspectSourceImage.inspect(new InspectSourceImageMessage(file, file.name));
      const normalizedFile = new File([file], file.name, { type: inspection.mimeType });
      const name = file.name.replace(/\.(jpe?g|png|arw)$/i, '') || 'Untitled project';
      const project = await application.createProject.create(
        new CreateProjectMessage(name, normalizedFile, file.name, inspection.width, inspection.height)
      );
      void application.persistentStorage.request();
      await refresh();
      void navigate(`/editor/${project.getId().valueOf()}`);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'The image could not be imported.');
    } finally {
      setBusy(false);
    }
  };

  const onImage = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file !== undefined) void createFromFile(file);
    event.target.value = '';
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
    <main className="library-shell">
      <header className="library-header">
        <a className="brand" href="/" aria-label="RAWcket library"><span className="brand-mark">R</span><span>RAWcket</span></a>
        <div className="header-actions">
          <button className="button ai-header-button" type="button" onClick={() => setSettingsOpen(true)}>✦ AI Studio</button>
          <button className="button ghost" type="button" onClick={() => bundleInput.current?.click()}>Import .rawcket</button>
          <button className="button primary" type="button" onClick={() => imageInput.current?.click()} disabled={busy}>{busy ? 'Importing…' : 'Import image'}</button>
        </div>
      </header>
      <input ref={imageInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,.arw,image/x-sony-arw" onChange={onImage} aria-label="Select a JPEG, PNG, or Sony ARW image" />
      <input ref={bundleInput} className="visually-hidden" type="file" accept=".rawcket,application/zip" onChange={(event) => void importBundle(event)} aria-label="Select a RAWcket project" />
      <section className="library-intro">
        <div>
          <span className="eyebrow">Local photo library</span>
          <h1>Your photographs. Your browser.</h1>
          <p>RAWcket keeps every original untouched and turns each decision into a reversible recipe. Its AI-first workflow helps you create while you remain in control of every parameter.</p>
        </div>
        <button className="demo-card" type="button" onClick={() => void createDemo()}>
          <span className="demo-orbit" aria-hidden="true" />
          <span><strong>Explore with a demo</strong><small>Generated on your device · no download</small></span>
          <span aria-hidden="true">→</span>
        </button>
      </section>
      <p className="storage-note">
        Local browser storage · private by default · not a replacement for a backup
        {storageCapacity?.supported === true && <span> · {formatBytes(storageCapacity.usageBytes)} used of {formatBytes(storageCapacity.quotaBytes)} · {storageCapacity.persistent ? 'persistent storage granted' : 'storage may be reclaimed by the browser'}</span>}
      </p>
      {error !== null && <p className="notice error" role="alert">{error}</p>}
      <section aria-labelledby="projects-title">
        <div className="section-heading"><h2 id="projects-title">Recent projects</h2><span>{filteredProjects.length} of {projects.length} {projects.length === 1 ? 'project' : 'projects'}</span></div>
        {projects.length > 0 && <div className="library-filters" role="search">
          <label><span>Search names and tags</span><input type="search" value={searchQuery} placeholder="Portrait, night, client…" onChange={(event) => setSearchQuery(event.target.value)} /></label>
          <label><span>Minimum rating</span><select value={minimumRating} onChange={(event) => setMinimumRating(Number(event.target.value))}>
            <option value={0}>All ratings</option>
            <option value={1}>★ and above</option>
            <option value={2}>★★ and above</option>
            <option value={3}>★★★ and above</option>
            <option value={4}>★★★★ and above</option>
            <option value={5}>★★★★★ only</option>
          </select></label>
          {(searchQuery.length > 0 || minimumRating > 0) && <button type="button" onClick={() => { setSearchQuery(''); setMinimumRating(0); }}>Clear filters</button>}
        </div>}
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">+</div>
            <h3>Start with a photograph</h3>
            <p>Import a JPEG, PNG, or Sony ARW. The original remains untouched and local.</p>
            <button className="button primary" type="button" onClick={() => imageInput.current?.click()}>Choose image</button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="empty-state compact">
            <h3>No matching projects</h3>
            <p>Try another name, tag, or rating.</p>
            <button className="button ghost" type="button" onClick={() => { setSearchQuery(''); setMinimumRating(0); }}>Clear filters</button>
          </div>
        ) : (
          <div className="project-grid">
            {filteredProjects.map((project) => {
              const id = project.getId().valueOf();
              const name = project.getName().valueOf();
              return (
                <article className="project-card" key={id}>
                  <button className="project-open" type="button" onClick={() => void navigate(`/editor/${id}`)} aria-label={`Open ${name}`}>
                    <ProjectThumbnail projectId={id} name={name} mimeType={project.getSourceMimeType().valueOf()} />
                    <span className="project-meta"><strong>{name}</strong><small>Edited {project.getUpdatedAt().toDate().toLocaleString('en')}</small></span>
                  </button>
                  <ProjectOrganizationControls project={project} onRate={(rating) => void changeRating(project, rating)} onTags={(tags) => void changeTags(project, tags)} />
                  <div className="project-actions" aria-label={`Actions for ${name}`}>
                    <button type="button" onClick={() => void rename(project)}>Rename</button>
                    <button type="button" onClick={() => void duplicate(id)}>Duplicate</button>
                    <button type="button" onClick={() => void exportProject(project)}>Export</button>
                    <button className="danger-text" type="button" onClick={() => void remove(project)}>Delete</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <AiSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}
