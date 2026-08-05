import { useCallback, useEffect, useRef, useState, type ChangeEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApplyEditOperationMessage } from '@/contexts/projects/application/apply-edit-operation/messages/ApplyEditOperationMessage';
import { CreateProjectMessage } from '@/contexts/projects/application/create-project/messages/CreateProjectMessage';
import { DeleteProjectMessage } from '@/contexts/projects/application/delete-project/messages/DeleteProjectMessage';
import { DuplicateProjectMessage } from '@/contexts/projects/application/duplicate-project/messages/DuplicateProjectMessage';
import { FindProjectMessage } from '@/contexts/projects/application/find-project/messages/FindProjectMessage';
import { EDIT_OPERATION } from '@/contexts/projects/domain/EditOperation';
import type { PhotoProjectSummary } from '@/contexts/projects/domain/PhotoProjectSummary';
import { useApplication } from '../ApplicationContext';
import { AiSettingsDialog } from '../components/AiSettingsDialog';
import { ProjectThumbnail } from '../components/ProjectThumbnail';
import { createDemoImageBlob, downloadBlob, readImageDimensions } from '../lib/browserImages';

export function LibraryPage(): ReactElement {
  const application = useApplication();
  const navigate = useNavigate();
  const imageInput = useRef<HTMLInputElement>(null);
  const bundleInput = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<PhotoProjectSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    setProjects(await application.listProjects.list());
  }, [application]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createFromFile = async (file: File): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const dimensions = await readImageDimensions(file);
      const name = file.name.replace(/\.(jpe?g|png)$/i, '') || 'Untitled project';
      const project = await application.createProject.create(
        new CreateProjectMessage(name, file, file.name, dimensions.width, dimensions.height)
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
      <input ref={imageInput} className="visually-hidden" type="file" accept="image/jpeg,image/png" onChange={onImage} aria-label="Select a JPEG or PNG image" />
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
      <p className="storage-note">Local browser storage · private by default · not a replacement for a backup</p>
      {error !== null && <p className="notice error" role="alert">{error}</p>}
      <section aria-labelledby="projects-title">
        <div className="section-heading"><h2 id="projects-title">Recent projects</h2><span>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span></div>
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">+</div>
            <h3>Start with a photograph</h3>
            <p>Import a JPEG or PNG. The original remains untouched and local.</p>
            <button className="button primary" type="button" onClick={() => imageInput.current?.click()}>Choose image</button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => {
              const id = project.getId().valueOf();
              const name = project.getName().valueOf();
              return (
                <article className="project-card" key={id}>
                  <button className="project-open" type="button" onClick={() => void navigate(`/editor/${id}`)} aria-label={`Open ${name}`}>
                    <ProjectThumbnail projectId={id} name={name} />
                    <span className="project-meta"><strong>{name}</strong><small>Edited {project.getUpdatedAt().toDate().toLocaleString('en')}</small></span>
                  </button>
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
