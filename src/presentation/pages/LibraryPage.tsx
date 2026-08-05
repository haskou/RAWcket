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
      const name = file.name.replace(/\.(jpe?g|png)$/i, '') || 'Proyecto sin titulo';
      const project = await application.createProject.create(
        new CreateProjectMessage(name, file, file.name, dimensions.width, dimensions.height)
      );
      void application.persistentStorage.request();
      await refresh();
      void navigate(`/editor/${project.getId().valueOf()}`);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'No se pudo importar la imagen.');
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
    const name = window.prompt('Nuevo nombre del proyecto', summary.getName().valueOf());
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
    if (!window.confirm(`Eliminar “${summary.getName().valueOf()}” y su original local?`)) return;
    await application.deleteProject.delete(new DeleteProjectMessage(summary.getId().valueOf()));
    await refresh();
  };

  const exportProject = async (summary: PhotoProjectSummary): Promise<void> => {
    const bundle = await application.projectExporter.exportProject(summary.getId());
    const safeName = summary.getName().valueOf().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '');
    downloadBlob(bundle, `${safeName || 'proyecto'}.rawcket`);
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
      setError(caught instanceof Error ? caught.message : 'No se pudo importar el bundle.');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  return (
    <main className="library-shell">
      <header className="library-header">
        <a className="brand" href="/" aria-label="RAWcket, biblioteca"><span className="brand-mark">R</span><span>RAWcket</span></a>
        <div className="header-actions">
          <button className="button ghost" type="button" onClick={() => setSettingsOpen(true)}>IA y privacidad</button>
          <button className="button ghost" type="button" onClick={() => bundleInput.current?.click()}>Importar .rawcket</button>
          <button className="button primary" type="button" onClick={() => imageInput.current?.click()} disabled={busy}>{busy ? 'Importando…' : 'Importar imagen'}</button>
        </div>
      </header>
      <input ref={imageInput} className="visually-hidden" type="file" accept="image/jpeg,image/png" onChange={onImage} aria-label="Seleccionar imagen JPEG o PNG" />
      <input ref={bundleInput} className="visually-hidden" type="file" accept=".rawcket,application/zip" onChange={(event) => void importBundle(event)} aria-label="Seleccionar proyecto RAWcket" />
      <section className="library-intro">
        <div>
          <span className="eyebrow">Biblioteca local</span>
          <h1>Tus imagenes. En tu navegador.</h1>
          <p>RAWcket conserva el original y guarda cada decision como una receta reversible. En esta version la imagen no se procesa: el modelo de edicion ya esta listo, con total honestidad.</p>
        </div>
        <button className="demo-card" type="button" onClick={() => void createDemo()}>
          <span className="demo-orbit" aria-hidden="true" />
          <span><strong>Explorar con una demo</strong><small>Generada en tu dispositivo · sin descargas</small></span>
          <span aria-hidden="true">→</span>
        </button>
      </section>
      <p className="storage-note">Almacenamiento local del navegador · privado por defecto · no sustituye una copia de seguridad</p>
      {error !== null && <p className="notice error" role="alert">{error}</p>}
      <section aria-labelledby="projects-title">
        <div className="section-heading"><h2 id="projects-title">Proyectos recientes</h2><span>{projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}</span></div>
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">+</div>
            <h3>Empieza por una imagen</h3>
            <p>Importa un JPEG o PNG. El original permanecera intacto y local.</p>
            <button className="button primary" type="button" onClick={() => imageInput.current?.click()}>Elegir imagen</button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((project) => {
              const id = project.getId().valueOf();
              const name = project.getName().valueOf();
              return (
                <article className="project-card" key={id}>
                  <button className="project-open" type="button" onClick={() => void navigate(`/editor/${id}`)} aria-label={`Abrir ${name}`}>
                    <ProjectThumbnail projectId={id} name={name} />
                    <span className="project-meta"><strong>{name}</strong><small>Editado {project.getUpdatedAt().toDate().toLocaleString()}</small></span>
                  </button>
                  <div className="project-actions" aria-label={`Acciones de ${name}`}>
                    <button type="button" onClick={() => void rename(project)}>Renombrar</button>
                    <button type="button" onClick={() => void duplicate(id)}>Duplicar</button>
                    <button type="button" onClick={() => void exportProject(project)}>Exportar</button>
                    <button className="danger-text" type="button" onClick={() => void remove(project)}>Eliminar</button>
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
