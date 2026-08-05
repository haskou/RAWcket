import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type WheelEvent
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApplyEditOperationMessage } from '@/contexts/projects/application/apply-edit-operation/messages/ApplyEditOperationMessage';
import { ChangeHistoryMessage } from '@/contexts/projects/application/change-history/messages/ChangeHistoryMessage';
import { ChooseInterfaceModeMessage } from '@/contexts/projects/application/choose-interface-mode/messages/ChooseInterfaceModeMessage';
import { FindProjectMessage } from '@/contexts/projects/application/find-project/messages/FindProjectMessage';
import { RenderProjectPreviewMessage } from '@/contexts/projects/application/render-project-preview/messages/RenderProjectPreviewMessage';
import { RequestEditingAdviceMessage } from '@/contexts/projects/application/request-editing-advice/messages/RequestEditingAdviceMessage';
import type { EditProposal } from '@/contexts/projects/application/ports/EditingAdvisor';
import { EDIT_OPERATION, type EditOperation } from '@/contexts/projects/domain/EditOperation';
import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import type { InterfaceModePrimitive } from '@/contexts/projects/domain/ProjectUiState';
import type { ToneCurvePrimitives } from '@/contexts/projects/domain/ToneCurve';
import type { ViewportTransformPrimitives } from '@/contexts/projects/domain/ViewportTransform';
import { AdjustmentKey, type AdjustmentKeyPrimitive } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import { useApplication } from '../ApplicationContext';
import { ActiveRecipePanel } from '../components/ActiveRecipePanel';
import { AdjustmentControls } from '../components/AdjustmentControls';
import { AiSettingsDialog } from '../components/AiSettingsDialog';
import { GeometryControls } from '../components/GeometryControls';
import { MaskControls } from '../components/MaskControls';
import {
  adjustmentDefinitions,
  type AdjustmentSection
} from '../editor/adjustmentDefinitions';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { useProjectAutosave } from '../hooks/useProjectAutosave';
import { downloadBlob } from '../lib/browserImages';

type EditorPanel = AdjustmentSection | 'curves' | 'crop' | 'masks' | 'ai';
type Pan = { x: number; y: number };
type PanGesture = Pan & { pointerId: number; startX: number; startY: number };
type BrushGesture = { pointerId: number; maskId: string; groupId: string };

const minimumZoom = 0.1;
const maximumZoom = 8;
const curvePresets: Record<'Identity' | 'S curve' | 'Fade', ToneCurvePrimitives> = {
  Identity: {
    points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    interpolation: 'monotonic-cubic'
  },
  'S curve': {
    points: [{ x: 0, y: 0 }, { x: 0.25, y: 0.18 }, { x: 0.75, y: 0.82 }, { x: 1, y: 1 }],
    interpolation: 'monotonic-cubic'
  },
  Fade: {
    points: [{ x: 0, y: 0.08 }, { x: 0.4, y: 0.43 }, { x: 1, y: 0.95 }],
    interpolation: 'monotonic-cubic'
  }
};

function clampZoom(value: number): number {
  return Math.min(maximumZoom, Math.max(minimumZoom, value));
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || (target instanceof HTMLElement && target.isContentEditable);
}

export function EditorPage(): ReactElement {
  const { projectId = '' } = useParams();
  const application = useApplication();
  const navigate = useNavigate();
  const panGesture = useRef<PanGesture | null>(null);
  const brushGesture = useRef<BrushGesture | null>(null);
  const previewSurface = useRef<HTMLDivElement>(null);
  const [project, setProject] = useState<PhotoProject | null>(null);
  const [source, setSource] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [renderProgress, setRenderProgress] = useState('Preparing preview');
  const [revision, setRevision] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);
  const [brushActive, setBrushActive] = useState(false);
  const [aiPointActive, setAiPointActive] = useState(false);
  const [brushSize, setBrushSize] = useState(0.08);
  const [activePanel, setActivePanel] = useState<EditorPanel>('ai');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Give this photograph a refined cinematic look while preserving natural skin tones.');
  const [aiMessage, setAiMessage] = useState('Local Smart Edit is ready. No photograph or metadata will leave this browser.');
  const [aiProposal, setAiProposal] = useState<EditProposal | null>(null);
  const [aiSelection, setAiSelection] = useState<Set<number>>(new Set());
  const [aiGenerating, setAiGenerating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sourceUrl = useObjectUrl(showOriginal ? source : preview ?? source);
  const save = useCallback((active: PhotoProject) => application.saveProject.save(active), [application]);
  const autosave = useProjectAutosave(project, revision, save);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const loaded = await application.findProject.find(new FindProjectMessage(projectId));
        if (loaded === null) {
          setLoadError('This project does not exist or has been deleted.');
          return;
        }
        setProject(loaded);
        setSource(await application.sourceFiles.find(loaded.getId()));
      } catch (error: unknown) {
        setLoadError(error instanceof Error ? error.message : 'The project could not be opened.');
      }
    };
    void load();
  }, [application, projectId]);

  useEffect(() => {
    if (project === null) return;
    const controller = new AbortController();
    setRenderProgress('Rendering');
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
        setRenderProgress('Preview up to date');
      }
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException) || error.name !== 'AbortError') {
        setRenderProgress('Preview unavailable; showing original');
      }
    });
    return () => controller.abort();
  }, [application, project, projectId, revision]);

  const apply = useCallback((operation: EditOperation): void => {
    if (project === null) return;
    application.applyEditOperation.apply(project, new ApplyEditOperationMessage(projectId, operation));
    setRevision((current) => current + 1);
  }, [application, project, projectId]);

  const changeHistory = useCallback((direction: 'undo' | 'redo'): void => {
    if (project === null) return;
    const message = new ChangeHistoryMessage(projectId);
    if (direction === 'undo') application.changeHistory.undo(project, message);
    else application.changeHistory.redo(project, message);
    setRevision((current) => current + 1);
  }, [application, project, projectId]);

  const fitPreview = useCallback((): void => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent): void => {
      if (isTextEntryTarget(event.target) || settingsOpen) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        changeHistory(event.shiftKey ? 'redo' : 'undo');
        return;
      }
      if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        changeHistory('redo');
        return;
      }
      if (event.key === '+' || event.key === '=') setZoom((value) => clampZoom(value + 0.1));
      else if (event.key === '-' || event.key === '_') setZoom((value) => clampZoom(value - 0.1));
      else if (event.key === '0') fitPreview();
      else if (event.key === 'ArrowLeft') setPan((value) => ({ ...value, x: value.x - 24 }));
      else if (event.key === 'ArrowRight') setPan((value) => ({ ...value, x: value.x + 24 }));
      else if (event.key === 'ArrowUp') setPan((value) => ({ ...value, y: value.y - 24 }));
      else if (event.key === 'ArrowDown') setPan((value) => ({ ...value, y: value.y + 24 }));
      else if (event.key === '1') setActivePanel('light');
      else if (event.key === '2') setActivePanel('color');
      else if (event.key === '3') setActivePanel('detail');
      else if (event.key === '4') setActivePanel('curves');
      else if (event.key.toLowerCase() === 'a') setActivePanel('ai');
      else if (event.key.toLowerCase() === 'b') setShowOriginal((value) => !value);
      else if (event.key.toLowerCase() === 'm') setActivePanel('masks');
      else if (event.key === 'Escape') { setBrushActive(false); setAiPointActive(false); }
      else if (event.key === '?') setShortcutsOpen((value) => !value);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [changeHistory, fitPreview, settingsOpen]);

  const changeMode = (mode: InterfaceModePrimitive): void => {
    if (project === null) return;
    application.chooseInterfaceMode.choose(project, new ChooseInterfaceModeMessage(mode));
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

  const changeAdjustment = (key: AdjustmentKeyPrimitive, value: number, groupId: string | null): void => {
    if (!Number.isFinite(value)) return;
    apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT, key, value, groupId });
  };

  const toggleAdjustment = (key: AdjustmentKeyPrimitive, enabled: boolean): void => {
    apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT_ENABLED, key, enabled, groupId: null });
  };

  const showAdjustment = (section: AdjustmentSection): void => {
    setActivePanel(section);
    window.requestAnimationFrame(() => document.getElementById(`tool-${section}`)?.scrollIntoView({ block: 'start' }));
  };

  const chooseCurvePreset = (name: keyof typeof curvePresets): void => {
    apply({
      kind: EDIT_OPERATION.SET_CURVE,
      channel: 'rgb',
      curve: curvePresets[name],
      groupId: null
    });
  };

  const changeViewport = (viewport: ViewportTransformPrimitives, groupId: string | null): void => {
    apply({ kind: EDIT_OPERATION.SET_VIEWPORT_TRANSFORM, viewport, groupId });
  };

  const updateMask = (mask: MaskDefinitionPrimitives, groupId: string | null): void => {
    apply({ kind: EDIT_OPERATION.UPDATE_MASK, mask, groupId });
  };

  const addBrushMask = (): void => {
    const id = crypto.randomUUID();
    apply({
      kind: EDIT_OPERATION.ADD_MASK,
      groupId: null,
      mask: {
        id,
        enabled: true,
        inverted: false,
        opacity: 1,
        feather: 0.2,
        density: 1,
        localAdjustments: { exposure: 0.5 },
        shape: { kind: 'brush', strokes: [] }
      }
    });
    setSelectedMaskId(id);
    setBrushActive(true);
    setAiPointActive(false);
  };

  const addRadialMask = (): void => {
    const id = crypto.randomUUID();
    apply({
      kind: EDIT_OPERATION.ADD_MASK,
      groupId: null,
      mask: {
        id,
        enabled: true,
        inverted: false,
        opacity: 1,
        feather: 0.5,
        density: 1,
        localAdjustments: { exposure: 0.5 },
        shape: { kind: 'radial', center: { x: 0.5, y: 0.5 }, radiusX: 0.25, radiusY: 0.25, rotationDegrees: 0 }
      }
    });
    setSelectedMaskId(id);
    setBrushActive(false);
    setAiPointActive(false);
  };

  const addAiMask = (): void => {
    const id = crypto.randomUUID();
    apply({
      kind: EDIT_OPERATION.ADD_MASK,
      groupId: null,
      mask: {
        id,
        enabled: true,
        inverted: false,
        opacity: 1,
        feather: 0.25,
        density: 1,
        localAdjustments: { exposure: 0.5 },
        shape: {
          kind: 'ai-segmentation',
          prompt: 'Local positive-point smart selection',
          positivePoints: [],
          negativePoints: [],
          boundingBoxes: [],
          strategy: 'local-spatial-luminance',
          version: '1',
          rasterCacheKey: null
        }
      }
    });
    setSelectedMaskId(id);
    setBrushActive(false);
    setAiPointActive(true);
  };

  const selectMask = (id: string): void => {
    setSelectedMaskId(id);
    setBrushActive(false);
    setAiPointActive(false);
  };

  const generateAiProposal = async (): Promise<void> => {
    if (project === null) return;
    setAiGenerating(true);
    setAiMessage('Analyzing your intent locally…');
    try {
      const proposal = await application.requestEditingAdvice.propose(
        project,
        new RequestEditingAdviceMessage(projectId, aiPrompt)
      );
      setAiProposal(proposal);
      setAiSelection(new Set(proposal.operations.map((_, index) => index)));
      setAiMessage('Proposal ready. Review every operation before applying it.');
    } catch (error: unknown) {
      setAiMessage(error instanceof Error ? error.message : 'The proposal could not be generated.');
    } finally {
      setAiGenerating(false);
    }
  };

  const applyAiProposal = (): void => {
    if (aiProposal === null) return;
    aiProposal.operations.forEach((operation, index) => {
      if (!aiSelection.has(index)) return;
      if (operation.kind === EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT) {
        const key = AdjustmentKey.fromPrimitives(operation.key);
        if (!project?.isGlobalAdjustmentEnabled(key)) {
          apply({ kind: EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT_ENABLED, key: operation.key, enabled: true, groupId: null });
        }
      }
      apply(operation);
    });
    setAiProposal(null);
    setAiSelection(new Set());
    setAiMessage('The selected operations were applied through the same reversible history as manual edits.');
  };

  const toggleAiOperation = (index: number): void => {
    setAiSelection((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const removeMask = (id: string): void => {
    apply({ kind: EDIT_OPERATION.REMOVE_MASK, maskId: id, groupId: null });
    setSelectedMaskId(null);
    setBrushActive(false);
    setAiPointActive(false);
  };

  const pointOnPreview = (event: ReactPointerEvent<HTMLDivElement>): { x: number; y: number } | null => {
    const bounds = previewSurface.current?.getBoundingClientRect();
    if (bounds === undefined || bounds.width === 0 || bounds.height === 0) return null;
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  };

  const beginBrushStroke = (event: ReactPointerEvent<HTMLDivElement>): boolean => {
    if (!brushActive || selectedMaskId === null) return false;
    const selected = project?.getMasks().find((mask) => mask.getId().valueOf() === selectedMaskId)?.toPrimitives();
    const point = pointOnPreview(event);
    if (selected?.shape.kind !== 'brush' || point === null) return true;
    const groupId = crypto.randomUUID();
    updateMask({
      ...selected,
      shape: {
        ...selected.shape,
        strokes: [...selected.shape.strokes, { points: [point], size: brushSize, hardness: 0.75, flow: 1 }]
      }
    }, groupId);
    brushGesture.current = { pointerId: event.pointerId, maskId: selected.id, groupId };
    event.currentTarget.setPointerCapture(event.pointerId);
    return true;
  };

  const addAiPoint = (event: ReactPointerEvent<HTMLDivElement>): boolean => {
    if (!aiPointActive || selectedMaskId === null) return false;
    const selected = project?.getMasks().find((mask) => mask.getId().valueOf() === selectedMaskId)?.toPrimitives();
    const point = pointOnPreview(event);
    if (selected?.shape.kind !== 'ai-segmentation' || point === null) return true;
    updateMask({
      ...selected,
      shape: { ...selected.shape, positivePoints: [...selected.shape.positivePoints, point] }
    }, null);
    return true;
  };

  const continueBrushStroke = (event: ReactPointerEvent<HTMLDivElement>): boolean => {
    const gesture = brushGesture.current;
    if (gesture?.pointerId !== event.pointerId) return false;
    const selected = project?.getMasks().find((mask) => mask.getId().valueOf() === gesture.maskId)?.toPrimitives();
    const point = pointOnPreview(event);
    if (selected?.shape.kind !== 'brush' || point === null) return true;
    const strokes = [...selected.shape.strokes];
    const current = strokes.at(-1);
    const previous = current?.points.at(-1);
    if (current === undefined || (previous !== undefined && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.002)) return true;
    strokes[strokes.length - 1] = { ...current, points: [...current.points, point] };
    updateMask({ ...selected, shape: { ...selected.shape, strokes } }, gesture.groupId);
    return true;
  };

  const startPan = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;
    if (addAiPoint(event)) return;
    if (beginBrushStroke(event)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panGesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, ...pan };
    setPanning(true);
  };

  const movePan = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (continueBrushStroke(event)) return;
    const gesture = panGesture.current;
    if (gesture?.pointerId !== event.pointerId) return;
    setPan({
      x: gesture.x + event.clientX - gesture.startX,
      y: gesture.y + event.clientY - gesture.startY
    });
  };

  const endPan = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (brushGesture.current?.pointerId === event.pointerId) {
      brushGesture.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (panGesture.current?.pointerId !== event.pointerId) return;
    panGesture.current = null;
    setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const changeZoom = (value: number): void => {
    if (Number.isFinite(value)) setZoom(clampZoom(value));
  };

  const zoomWithWheel = (event: WheelEvent<HTMLDivElement>): void => {
    event.preventDefault();
    changeZoom(zoom * (event.deltaY < 0 ? 1.1 : 0.9));
  };

  if (loadError !== null) {
    return <main className="centered-state"><h1>Unable to open</h1><p>{loadError}</p><button className="button primary" onClick={() => void navigate('/')}>Back to library</button></main>;
  }
  if (project === null) return <main className="centered-state"><div className="loader" /><p>Opening local project…</p></main>;

  const mode = project.getInterfaceMode().valueOf();
  const statusLabel = autosave.status === 'saved' ? 'Saved locally' : autosave.status === 'saving' ? 'Saving…' : 'Save failed';
  const transform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`;

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <button className="icon-button back-button" type="button" onClick={() => void close()} aria-label="Close project and return">←</button>
        <a className="brand compact" href="/" onClick={(event) => { event.preventDefault(); void close(); }}><span className="brand-mark">R</span><span>RAWcket</span></a>
        <div className="project-title-block">
          <input className="project-title-input" aria-label="Project name" defaultValue={project.getName().valueOf()} onBlur={(event) => rename(event.target.value)} onKeyDown={handleNameKey} />
          <span className={`save-status ${autosave.status}`} aria-live="polite"><span aria-hidden="true">●</span> {statusLabel}</span>
        </div>
        <div className="history-actions">
          <button className="icon-button" type="button" disabled={!project.canUndo()} onClick={() => changeHistory('undo')} aria-label="Undo">↶</button>
          <button className="icon-button" type="button" disabled={!project.canRedo()} onClick={() => changeHistory('redo')} aria-label="Redo">↷</button>
          <button className="icon-button shortcut-button" type="button" onClick={() => setShortcutsOpen(true)} aria-label="Keyboard shortcuts">⌨</button>
        </div>
        <button className="button ai-header-button" type="button" onClick={() => setActivePanel('ai')}><span aria-hidden="true">✦</span> AI Edit</button>
        <button className="button primary" type="button" onClick={() => void exportBundle()}>Export project</button>
      </header>
      {autosave.error !== null && <p className="editor-error" role="alert">{autosave.error}</p>}
      <section className="editor-workspace">
        <ActiveRecipePanel project={project} onNavigate={showAdjustment} onToggle={toggleAdjustment} onNavigateTool={setActivePanel} />
        <div className="canvas-area">
          <div className="canvas-toolbar" aria-label="Preview controls">
            <button type="button" onClick={() => changeZoom(zoom - 0.1)} aria-label="Zoom out">−</button>
            <input aria-label="Preview zoom" type="range" min={minimumZoom} max={maximumZoom} step="0.05" value={zoom} onChange={(event) => changeZoom(event.currentTarget.valueAsNumber)} />
            <label><span className="visually-hidden">Zoom percentage</span><input type="number" min={10} max={800} step={1} value={Math.round(zoom * 100)} onChange={(event) => changeZoom(event.currentTarget.valueAsNumber / 100)} />%</label>
            <button type="button" onClick={() => changeZoom(zoom + 0.1)} aria-label="Zoom in">+</button>
            <button type="button" onClick={fitPreview}>Fit</button>
            <button className={showOriginal ? 'active' : ''} type="button" onClick={() => setShowOriginal((value) => !value)}>{showOriginal ? 'Before' : 'After'} · B</button>
          </div>
          <div
            className={`photo-stage ${panning ? 'panning' : ''} ${brushActive || aiPointActive ? 'painting' : ''}`}
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            onWheel={zoomWithWheel}
            aria-label="Photo preview. Drag to pan and use the mouse wheel to zoom."
          >
            {sourceUrl !== null && (
              <div ref={previewSurface} className="preview-surface" style={{ transform }}>
                <img draggable={false} className="source-preview" src={sourceUrl} alt={`Preview of ${project.getName().valueOf()}`} />
                {!showOriginal && (activePanel === 'masks' || brushActive || aiPointActive) && <MaskOverlay masks={project.getMasks().map((mask) => mask.toPrimitives())} />}
              </div>
            )}
            <div className="truth-badge"><span aria-hidden="true">◇</span><span><strong>Reference CPU preview</strong><small>Full global recipe and curves · {renderProgress}</small></span></div>
            {showOriginal && <div className="comparison-badge">Original · Before</div>}
            <div className="pan-hint">Drag to pan · Wheel to zoom · 0 to fit</div>
          </div>
        </div>
        <aside className="tools-panel" aria-label="Editing tools">
          <section className="ai-hero">
            <div><span className="ai-orb" aria-hidden="true">✦</span><span><strong>RAWcket AI</strong><small>Your editing copilot</small></span></div>
            <p>Describe the result you want. Local Smart Edit turns it into explicit, reversible recipe changes.</p>
            <button className="button ai-primary full" type="button" onClick={() => setActivePanel('ai')}>Create with AI</button>
          </section>
          <div className="mode-switch" aria-label="Interface level">
            <button className={mode === 'simple' ? 'active' : ''} type="button" onClick={() => changeMode('simple')}>Simple</button>
            <button className={mode === 'advanced' ? 'active' : ''} type="button" onClick={() => changeMode('advanced')}>Advanced</button>
          </div>
          <ToolSection id="ai" title="AI Studio" active={activePanel === 'ai'} onToggle={setActivePanel} badge="Core workflow">
            <label className="field-label" htmlFor="ai-edit-prompt">What should RAWcket create?</label>
            <textarea id="ai-edit-prompt" className="ai-prompt" rows={5} value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} />
            <div className="ai-quick-prompts" aria-label="AI prompt ideas">
              {['Natural portrait', 'Cinematic night', 'Recover highlights'].map((prompt) => <button key={prompt} type="button" onClick={() => setAiPrompt(prompt)}>{prompt}</button>)}
            </div>
            <button className="button ai-primary full" type="button" disabled={aiGenerating || aiPrompt.trim().length < 3} onClick={() => void generateAiProposal()}>{aiGenerating ? 'Generating locally…' : 'Generate editable proposal'}</button>
            <p className="ai-status" aria-live="polite">{aiMessage}</p>
            {aiProposal !== null && (
              <div className="ai-proposal" aria-label="AI edit proposal">
                <p>{aiProposal.explanation}</p>
                <div className="ai-proposal-operations">
                  {aiProposal.operations.map((operation, index) => (
                    <label key={`${operation.kind}-${index}`}>
                      <input type="checkbox" checked={aiSelection.has(index)} onChange={() => toggleAiOperation(index)} />
                      <span>{describeOperation(operation)}</span>
                    </label>
                  ))}
                </div>
                <div className="ai-proposal-actions">
                  <button className="button ghost" type="button" onClick={() => { setAiProposal(null); setAiSelection(new Set()); setAiMessage('Proposal rejected. The project was not changed.'); }}>Reject</button>
                  <button className="button ai-primary" type="button" disabled={aiSelection.size === 0} onClick={applyAiProposal}>Apply selected</button>
                </div>
              </div>
            )}
            <button className="button ghost full" type="button" onClick={() => setSettingsOpen(true)}>Optional cloud AI and privacy settings</button>
          </ToolSection>
          <ToolSection id="light" title="Light" active={activePanel === 'light'} onToggle={setActivePanel} badge="Shortcut 1">
            <AdjustmentControls project={project} definitions={adjustmentDefinitions.filter((item) => item.section === 'light')} onChange={changeAdjustment} />
          </ToolSection>
          <ToolSection id="color" title="Color" active={activePanel === 'color'} onToggle={setActivePanel} badge="Shortcut 2">
            <AdjustmentControls project={project} definitions={adjustmentDefinitions.filter((item) => item.section === 'color')} onChange={changeAdjustment} />
          </ToolSection>
          <ToolSection id="detail" title="Detail" active={activePanel === 'detail'} onToggle={setActivePanel} badge="Shortcut 3">
            <AdjustmentControls project={project} definitions={adjustmentDefinitions.filter((item) => item.section === 'detail')} onChange={changeAdjustment} />
          </ToolSection>
          <ToolSection id="curves" title="Tone Curve" active={activePanel === 'curves'} onToggle={setActivePanel} badge="Shortcut 4">
            <p>Choose a real-time RGB curve preset. Every change is non-destructive and undoable.</p>
            <div className="curve-presets">
              {(Object.keys(curvePresets) as Array<keyof typeof curvePresets>).map((name) => <button type="button" key={name} onClick={() => chooseCurvePreset(name)}>{name}</button>)}
            </div>
          </ToolSection>
          <ToolSection id="crop" title="Crop & Geometry" active={activePanel === 'crop'} onToggle={setActivePanel} badge="Rendered">
            <p>Crop, image position, scale, rotation, and flips are persisted, undoable, and rendered by the reference pipeline.</p>
            <GeometryControls project={project} onChange={changeViewport} />
          </ToolSection>
          <ToolSection id="masks" title="Masks" active={activePanel === 'masks'} onToggle={setActivePanel} badge="AI ready">
            <p>Local masks remain editable recipe data. Brush and radial coverage now render through the reference pipeline.</p>
            <MaskControls
              project={project}
              selectedId={selectedMaskId}
              brushActive={brushActive}
              aiPointActive={aiPointActive}
              brushSize={brushSize}
              onSelect={selectMask}
              onAddBrush={addBrushMask}
              onAddRadial={addRadialMask}
              onAddAi={addAiMask}
              onUpdate={updateMask}
              onRemove={removeMask}
              onBrushActiveChange={(active) => { setBrushActive(active); if (active) setAiPointActive(false); }}
              onAiPointActiveChange={(active) => { setAiPointActive(active); if (active) setBrushActive(false); }}
              onBrushSizeChange={setBrushSize}
            />
          </ToolSection>
        </aside>
      </section>
      <AiSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
    </main>
  );
}

function ToolSection({ id, title, active, onToggle, badge, children }: {
  id: EditorPanel;
  title: string;
  active: boolean;
  onToggle: (id: EditorPanel) => void;
  badge?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section id={`tool-${id}`} className={`tool-section ${active ? 'open' : ''}`}>
      <button type="button" className="tool-heading" onClick={() => onToggle(id)} aria-expanded={active}>
        <span>{title}</span><span>{badge !== undefined && <small>{badge}</small>}<b aria-hidden="true">⌄</b></span>
      </button>
      {active && <div className="tool-content">{children}</div>}
    </section>
  );
}

function ShortcutsDialog({ onClose }: { onClose: () => void }): ReactElement {
  const shortcuts = [
    ['Undo / redo', '⌘/Ctrl Z · ⇧⌘/Ctrl Z'],
    ['Zoom in / out', '+ · −'],
    ['Fit preview', '0'],
    ['Pan preview', 'Drag · Arrow keys'],
    ['Light / Color / Detail', '1 · 2 · 3'],
    ['Tone Curve', '4'],
    ['AI Studio', 'A'],
    ['Before / after', 'B'],
    ['Masks', 'M'],
    ['Shortcut guide', '?']
  ];
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="dialog shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="dialog-heading"><div><span className="eyebrow">Work faster</span><h2 id="shortcuts-title">Keyboard shortcuts</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close shortcuts">×</button></div>
        <dl>{shortcuts.map(([label, keys]) => <div key={label}><dt>{label}</dt><dd>{keys}</dd></div>)}</dl>
      </section>
    </div>
  );
}

function MaskOverlay({ masks }: { masks: MaskDefinitionPrimitives[] }): ReactElement {
  return (
    <svg className="mask-overlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Local mask overlay">
      {masks.filter((mask) => mask.enabled).map((mask) => {
        if (mask.shape.kind === 'brush') {
          return <g key={mask.id}>{mask.shape.strokes.map((stroke, index) => <polyline key={index} points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" strokeWidth={stroke.size} strokeLinecap="round" strokeLinejoin="round" />)}</g>;
        }
        if (mask.shape.kind === 'radial') {
          return <ellipse key={mask.id} cx={mask.shape.center.x} cy={mask.shape.center.y} rx={mask.shape.radiusX} ry={mask.shape.radiusY} fill="currentColor" transform={`rotate(${mask.shape.rotationDegrees} ${mask.shape.center.x} ${mask.shape.center.y})`} />;
        }
        if (mask.shape.kind === 'ai-segmentation') {
          return <g className="smart-mask-points" key={mask.id}>{mask.shape.positivePoints.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="0.012" />)}</g>;
        }
        return null;
      })}
    </svg>
  );
}

function describeOperation(operation: EditOperation): string {
  if (operation.kind === EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT) {
    const label = adjustmentDefinitions.find((definition) => definition.key === operation.key)?.label ?? operation.key;
    return `${label}: ${operation.value > 0 ? '+' : ''}${operation.value}`;
  }
  if (operation.kind === EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT_ENABLED) return `${operation.enabled ? 'Enable' : 'Disable'} ${operation.key}`;
  if (operation.kind === EDIT_OPERATION.SET_CURVE) return `Update ${operation.channel.toUpperCase()} curve`;
  if (operation.kind === EDIT_OPERATION.SET_VIEWPORT_TRANSFORM) return 'Update crop and geometry';
  if (operation.kind === EDIT_OPERATION.RENAME_PROJECT) return `Rename project to ${operation.name}`;
  if (operation.kind === EDIT_OPERATION.REMOVE_MASK) return 'Remove local mask';
  return operation.kind === EDIT_OPERATION.ADD_MASK ? 'Add local mask' : 'Update local mask';
}
