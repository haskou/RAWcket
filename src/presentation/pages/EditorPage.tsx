import { useCallback, useEffect, useState, type KeyboardEvent, type ReactElement } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApplyEditOperationMessage } from '@/contexts/projects/application/apply-edit-operation/messages/ApplyEditOperationMessage';
import { ChangeHistoryMessage } from '@/contexts/projects/application/change-history/messages/ChangeHistoryMessage';
import { ChooseInterfaceModeMessage } from '@/contexts/projects/application/choose-interface-mode/messages/ChooseInterfaceModeMessage';
import { FindProjectMessage } from '@/contexts/projects/application/find-project/messages/FindProjectMessage';
import { RenderProjectPreviewMessage } from '@/contexts/projects/application/render-project-preview/messages/RenderProjectPreviewMessage';
import { EDIT_OPERATION, type EditOperation } from '@/contexts/projects/domain/EditOperation';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import type { InterfaceModePrimitive } from '@/contexts/projects/domain/ProjectUiState';
import { AdjustmentKey, type AdjustmentKeyPrimitive } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import { useApplication } from '../ApplicationContext';
import { AiSettingsDialog } from '../components/AiSettingsDialog';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { useProjectAutosave } from '../hooks/useProjectAutosave';
import { downloadBlob } from '../lib/browserImages';

const adjustmentLabels: Array<{ key: AdjustmentKeyPrimitive; label: string; step: number }> = [
  { key: 'exposure', label: 'Exposicion', step: 0.25 },
  { key: 'contrast', label: 'Contraste', step: 5 },
  { key: 'highlights', label: 'Luces', step: 5 },
  { key: 'shadows', label: 'Sombras', step: 5 }
];

export function EditorPage(): ReactElement {
  const { projectId = '' } = useParams();
  const application = useApplication();
  const navigate = useNavigate();
  const [project, setProject] = useState<PhotoProject | null>(null);
  const [source, setSource] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [renderProgress, setRenderProgress] = useState<string>('Preparando preview');
  const [revision, setRevision] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [activePanel, setActivePanel] = useState('light');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sourceUrl = useObjectUrl(preview ?? source);
  const save = useCallback((active: PhotoProject) => application.saveProject.save(active), [application]);
  const autosave = useProjectAutosave(project, revision, save);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const loaded = await application.findProject.find(new FindProjectMessage(projectId));
        if (loaded === null) {
          setLoadError('Este proyecto no existe o fue eliminado.');
          return;
        }
        setProject(loaded);
        setSource(await application.sourceFiles.find(loaded.getId()));
      } catch (error: unknown) {
        setLoadError(error instanceof Error ? error.message : 'No se pudo abrir el proyecto.');
      }
    };
    void load();
  }, [application, projectId]);

  useEffect(() => {
    if (project === null) return;
    const controller = new AbortController();
    setRenderProgress('Renderizando');
    void application.renderProjectPreview.render(
      project,
      new RenderProjectPreviewMessage(projectId, 2560),
      {
        signal: controller.signal,
        onProgress: (progress) => setRenderProgress(`${progress.stage} ${Math.round(progress.completed * 100)}%`)
      }
    ).then((result) => {
      if (result instanceof Blob) {
        setPreview(result);
        setRenderProgress('Preview actualizada');
      }
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException) || error.name !== 'AbortError') {
        setRenderProgress('Preview no disponible; mostrando original');
      }
    });
    return () => controller.abort();
  }, [application, project, projectId, revision]);

  const apply = (operation: EditOperation): void => {
    if (project === null) return;
    application.applyEditOperation.apply(project, new ApplyEditOperationMessage(projectId, operation));
    setRevision((current) => current + 1);
  };

  const adjust = (key: AdjustmentKeyPrimitive, delta: number): void => {
    if (project === null) return;
    const adjustmentKey = AdjustmentKey.fromPrimitives(key);
    const current = project.getGlobalAdjustment(adjustmentKey).valueOf();
    apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key, value: current + delta, groupId: null });
  };

  const resetAdjustment = (key: AdjustmentKeyPrimitive): void => {
    apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key, value: 0, groupId: null });
  };

  const changeMode = (mode: InterfaceModePrimitive): void => {
    if (project === null) return;
    application.chooseInterfaceMode.choose(project, new ChooseInterfaceModeMessage(mode));
    setRevision((current) => current + 1);
  };

  const changeHistory = (direction: 'undo' | 'redo'): void => {
    if (project === null) return;
    const message = new ChangeHistoryMessage(projectId);
    if (direction === 'undo') application.changeHistory.undo(project, message);
    else application.changeHistory.redo(project, message);
    setRevision((current) => current + 1);
  };

  const close = async (): Promise<void> => {
    await autosave.flush();
    void navigate('/');
  };

  const exportBundle = async (): Promise<void> => {
    if (project === null) return;
    await autosave.flush();
    const bundle = await application.projectExporter.exportProject(project.getId());
    downloadBlob(bundle, `${project.getName().valueOf().replace(/[^a-z0-9-_]+/gi, '-')}.rawcket`);
  };

  const rename = (name: string): void => {
    if (project === null || name.trim() === project.getName().valueOf()) return;
    apply({ kind: EDIT_OPERATION.RENAME_PROJECT, name, groupId: null });
  };

  const handleNameKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') event.currentTarget.blur();
  };

  if (loadError !== null) return <main className="centered-state"><h1>No se pudo abrir</h1><p>{loadError}</p><button className="button primary" onClick={() => void navigate('/')}>Volver a biblioteca</button></main>;
  if (project === null) return <main className="centered-state"><div className="loader" /><p>Abriendo proyecto local…</p></main>;

  const mode = project.getInterfaceMode().valueOf();
  const statusLabel = autosave.status === 'saved' ? 'Guardado localmente' : autosave.status === 'saving' ? 'Guardando…' : 'Error al guardar';

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <button className="icon-button back-button" type="button" onClick={() => void close()} aria-label="Cerrar proyecto y volver">←</button>
        <a className="brand compact" href="/" onClick={(event) => { event.preventDefault(); void close(); }}><span className="brand-mark">R</span><span>RAWcket</span></a>
        <div className="project-title-block">
          <input className="project-title-input" aria-label="Nombre del proyecto" defaultValue={project.getName().valueOf()} onBlur={(event) => rename(event.target.value)} onKeyDown={handleNameKey} />
          <span className={`save-status ${autosave.status}`} aria-live="polite"><span aria-hidden="true">●</span> {statusLabel}</span>
        </div>
        <div className="history-actions">
          <button className="icon-button" type="button" disabled={!project.canUndo()} onClick={() => changeHistory('undo')} aria-label="Deshacer">↶</button>
          <button className="icon-button" type="button" disabled={!project.canRedo()} onClick={() => changeHistory('redo')} aria-label="Rehacer">↷</button>
        </div>
        <button className="button ghost" type="button" disabled title="El motor de revelado aun no esta implementado">Antes / despues · pendiente</button>
        <button className="button primary" type="button" onClick={() => void exportBundle()}>Exportar proyecto</button>
      </header>
      {autosave.error !== null && <p className="editor-error" role="alert">{autosave.error}</p>}
      <section className="editor-workspace">
        <div className="canvas-area">
          <div className="canvas-toolbar" aria-label="Controles de vista">
            <button type="button" onClick={() => setZoom((value) => Math.max(0.25, value - 0.25))} aria-label="Alejar vista">−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.25))} aria-label="Acercar vista">+</button>
            <button type="button" onClick={() => setZoom(1)}>Ajustar</button>
          </div>
          <div className="photo-stage">
            {sourceUrl !== null && <img className="source-preview" src={sourceUrl} alt={`Original de ${project.getName().valueOf()}`} style={{ transform: `scale(${zoom})` }} />}
            <div className="truth-badge"><span aria-hidden="true">◇</span><span><strong>Preview CPU de referencia</strong><small>Exposicion y contraste reales · {renderProgress}</small></span></div>
          </div>
          <div className="recipe-strip">
            <span>Receta activa</span>
            <strong>Exposicion {project.getGlobalAdjustment(AdjustmentKey.EXPOSURE).valueOf().toFixed(2)}</strong>
            <strong>Contraste {project.getGlobalAdjustment(AdjustmentKey.CONTRAST).valueOf()}</strong>
          </div>
        </div>
        <aside className="tools-panel" aria-label="Herramientas de edicion">
          <div className="mode-switch" aria-label="Nivel de interfaz">
            <button className={mode === 'simple' ? 'active' : ''} type="button" onClick={() => changeMode('simple')}>Simple</button>
            <button className={mode === 'advanced' ? 'active' : ''} type="button" onClick={() => changeMode('advanced')}>Advanced</button>
          </div>
          <p className="panel-intro">Los controles modifican y persisten la receta. No alteran los pixeles todavia.</p>
          <ToolSection id="light" title="Luz" active={activePanel === 'light'} onToggle={setActivePanel}>
            <div className="adjustment-list">
              {adjustmentLabels.map(({ key, label, step }) => {
                const value = project.getGlobalAdjustment(AdjustmentKey.fromPrimitives(key)).valueOf();
                return (
                  <div className="adjustment-row" key={key}>
                    <div><span>{label}</span><output aria-label={`${label}: ${value}`}>{value > 0 ? '+' : ''}{value}</output></div>
                    <div className="stepper">
                      <button type="button" onClick={() => adjust(key, -step)} aria-label={`Reducir ${label}`}>−</button>
                      <button type="button" onClick={() => resetAdjustment(key)} aria-label={`Restablecer ${label}`}>Reset</button>
                      <button type="button" onClick={() => adjust(key, step)} aria-label={`Aumentar ${label}`}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ToolSection>
          <ToolSection id="color" title="Color" active={activePanel === 'color'} onToggle={setActivePanel} badge="Modelo listo">
            <p>Temperatura, tint, saturacion y vibrance ya tienen rangos validados. El procesamiento visual se implementara con el pipeline.</p>
          </ToolSection>
          <ToolSection id="curves" title="Curvas" active={activePanel === 'curves'} onToggle={setActivePanel} badge="Alta prioridad">
            <p>RGB, R, G, B y luminancia estan modeladas con puntos normalizados e interpolacion validada. El editor grafico no esta disponible aun.</p>
          </ToolSection>
          {mode === 'advanced' && <ToolSection id="crop" title="Recorte y geometria" active={activePanel === 'crop'} onToggle={setActivePanel} badge="Pendiente">
            <p>La transformacion no destructiva admite marco, traslacion, zoom, rotacion, flip y proporcion. Falta conectarla al lienzo.</p>
          </ToolSection>}
          <ToolSection id="masks" title="Mascaras" active={activePanel === 'masks'} onToggle={setActivePanel} badge="Pendiente">
            <p>El JSON admite pincel, gradientes, rangos, IA y composicion add/subtract/intersect. El render y la interaccion llegaran despues.</p>
          </ToolSection>
          <ToolSection id="ai" title="IA opcional" active={activePanel === 'ai'} onToggle={setActivePanel} badge="Desactivada">
            <p>Ninguna imagen ni metadata sale del navegador. No hay proveedor conectado.</p>
            <button className="button ghost full" type="button" onClick={() => setSettingsOpen(true)}>Configurar almacenamiento de key</button>
          </ToolSection>
        </aside>
      </section>
      <AiSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}

function ToolSection({ id, title, active, onToggle, badge, children }: {
  id: string;
  title: string;
  active: boolean;
  onToggle: (id: string) => void;
  badge?: string;
  children: ReactElement | ReactElement[] | string;
}): ReactElement {
  return (
    <section className={`tool-section ${active ? 'open' : ''}`}>
      <button type="button" className="tool-heading" onClick={() => onToggle(active ? '' : id)} aria-expanded={active}>
        <span>{title}</span><span>{badge !== undefined && <small>{badge}</small>}<b aria-hidden="true">⌄</b></span>
      </button>
      {active && <div className="tool-content">{children}</div>}
    </section>
  );
}
