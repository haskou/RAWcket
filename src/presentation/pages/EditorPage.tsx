import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type WheelEvent
} from 'react';
import { Debouncer, FlowCancelledError } from '@haskou/flow';
import { useNavigate, useParams } from 'react-router-dom';
import { ApplyEditOperationMessage } from '@/contexts/projects/application/apply-edit-operation/messages/ApplyEditOperationMessage';
import { UploadCloudAssetMessage } from '@/contexts/cloud-storage/application/manage-cloud-storage/messages/UploadCloudAssetMessage';
import { ChangeHistoryMessage } from '@/contexts/projects/application/change-history/messages/ChangeHistoryMessage';
import { CreateSemanticMaskMessage } from '@/contexts/projects/application/create-semantic-mask/messages/CreateSemanticMaskMessage';
import { DecideAiDevelopmentAdviceMessage } from '@/contexts/projects/application/decide-ai-development-advice/messages/DecideAiDevelopmentAdviceMessage';
import { FindProjectMessage } from '@/contexts/projects/application/find-project/messages/FindProjectMessage';
import { ExportProjectPhotoMessage } from '@/contexts/projects/application/export-project-photo/messages/ExportProjectPhotoMessage';
import { EstimateHorizonMessage } from '@/contexts/projects/application/estimate-horizon/messages/EstimateHorizonMessage';
import { InspectSourceImageMessage } from '@/contexts/projects/application/inspect-source-image/messages/InspectSourceImageMessage';
import { CreateRecipePresetMessage } from '@/contexts/projects/application/manage-recipe-presets/messages/CreateRecipePresetMessage';
import { DeleteRecipePresetMessage } from '@/contexts/projects/application/manage-recipe-presets/messages/DeleteRecipePresetMessage';
import { ExportRecipePresetMessage, ImportRecipePresetMessage } from '@/contexts/projects/application/manage-recipe-presets/messages/TransferRecipePresetMessage';
import { UpdateRecipePresetMessage } from '@/contexts/projects/application/manage-recipe-presets/messages/UpdateRecipePresetMessage';
import { RenderProjectBaselineMessage } from '@/contexts/projects/application/render-project-baseline/messages/RenderProjectBaselineMessage';
import { RenderProjectCropPreviewMessage } from '@/contexts/projects/application/render-project-crop-preview/messages/RenderProjectCropPreviewMessage';
import { RenderProjectPreviewMessage } from '@/contexts/projects/application/render-project-preview/messages/RenderProjectPreviewMessage';
import { RecordAiDevelopmentAdviceMessage } from '@/contexts/projects/application/record-ai-development-advice/messages/RecordAiDevelopmentAdviceMessage';
import { RequestEditingAdviceMessage } from '@/contexts/projects/application/request-editing-advice/messages/RequestEditingAdviceMessage';
import { SuggestAutomaticEnhancementMessage } from '@/contexts/projects/application/suggest-automatic-enhancement/messages/SuggestAutomaticEnhancementMessage';
import type { EditProposal } from '@/contexts/projects/application/ports/EditingAdvisor';
import type { PreviewAnalysis } from '@/contexts/projects/application/ports/PreviewRenderer';
import type { SemanticModelStatus } from '@/contexts/projects/application/ports/SemanticSegmentationModel';
import { EDIT_OPERATION, type EditOperation } from '@/contexts/projects/domain/EditOperation';
import type { AiDevelopmentAdvicePrimitives } from '@/contexts/projects/domain/AiDevelopmentJournal';
import { GlobalAdjustments } from '@/contexts/projects/domain/GlobalAdjustments';
import { DevelopmentRecipe, type DevelopmentSettingsPrimitives } from '@/contexts/projects/domain/DevelopmentRecipe';
import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';
import type { PhotoProject } from '@/contexts/projects/domain/PhotoProject';
import type { RecipePreset } from '@/contexts/projects/domain/RecipePreset';
import { CurveSet, type ToneCurvePrimitives } from '@/contexts/projects/domain/ToneCurve';
import type { ViewportTransformPrimitives } from '@/contexts/projects/domain/ViewportTransform';
import { AdjustmentKey, type AdjustmentKeyPrimitive } from '@/contexts/projects/domain/value-objects/AdjustmentKey';
import type { SemanticMaskCategoryPrimitive } from '@/contexts/projects/domain/value-objects/SemanticMaskCategory';
import type { MaskCompositionOperationPrimitive } from '@/contexts/projects/domain/value-objects/MaskCompositionOperation';
import { useApplication } from '../ApplicationContext';
import { ActiveRecipePanel } from '../components/ActiveRecipePanel';
import { AdjustmentControls } from '../components/AdjustmentControls';
import { AiSettingsDialog } from '../components/AiSettingsDialog';
import { CloudStorageDialog } from '../components/CloudStorageDialog';
import { GeometryControls } from '../components/GeometryControls';
import { ExportPhotoDialog, type PhotoExportSettings } from '../components/ExportPhotoDialog';
import { MaskControls } from '../components/MaskControls';
import { PhotoInformationDialog } from '../components/PhotoInformationDialog';
import { SemanticMaskControls, type SemanticModelTask } from '../components/SemanticMaskControls';
import { ToneCurveEditor } from '../components/ToneCurveEditor';
import { HistogramPanel } from '../components/HistogramPanel';
import {
  adjustmentDefinitions,
  type AdjustmentSection
} from '../editor/adjustmentDefinitions';
import type { CompositionGuide } from '../editor/CompositionGuide';
import { CropFrameProjector, type CropPoint } from '../editor/CropFrameProjector';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { useProjectAutosave } from '../hooks/useProjectAutosave';
import { downloadBlob } from '../lib/browserImages';

type EditorPanel = AdjustmentSection | 'curves' | 'crop' | 'masks' | 'ai';
type ToolWorkspace = 'ai' | 'develop';
type InspectorTab = 'edit' | 'crop' | 'masks' | 'ai' | 'history';
type Pan = { x: number; y: number };
type PanGesture = Pan & { pointerId: number; startX: number; startY: number };
type BrushGesture = { pointerId: number; maskId: string; groupId: string };
type CropGesture =
  | { kind: 'draw'; pointerId: number; anchor: CropPoint }
  | { kind: 'move'; pointerId: number; pointerStart: CropPoint; cropStart: ViewportTransformPrimitives['cropFrame'] };
type AiPointPolarity = 'positive' | 'negative';
type ImageDimensions = { width: number; height: number };
type PendingAiAction = 'opinion' | 'prompt' | null;

const inspectorTabs: ReadonlyArray<{ id: InspectorTab; label: string; icon: string }> = [
  { id: 'edit', label: 'Edit', icon: '☼' },
  { id: 'crop', label: 'Crop', icon: '⌗' },
  { id: 'masks', label: 'Masks', icon: '◐' },
  { id: 'ai', label: 'AI', icon: '✦' },
  { id: 'history', label: 'History', icon: '◷' }
];

const minimumZoom = 0.1;
const maximumZoom = 8;
const compositionGuideSequence: CompositionGuide[] = ['none', 'thirds', 'grid', 'diagonals', 'golden-ratio'];
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
type BuiltInPresetName = 'Natural' | 'Cinematic' | 'Monochrome';

function builtInPreset(name: BuiltInPresetName): DevelopmentSettingsPrimitives {
  const adjustments = GlobalAdjustments.neutral().toPrimitives();
  const curves = CurveSet.identity().toPrimitives();
  if (name === 'Natural') {
    return {
      globalAdjustments: { ...adjustments, highlights: -18, shadows: 12, vibrance: 8, clarity: 4, texture: 5, sharpness: 10 },
      curves,
      disabledGlobalAdjustments: []
    };
  }
  if (name === 'Cinematic') {
    return {
      globalAdjustments: { ...adjustments, contrast: 12, highlights: -28, shadows: 8, temperature: -6, tint: 3, saturation: -8, dehaze: 7, vignette: -18 },
      curves: { ...curves, rgb: curvePresets['S curve'] },
      disabledGlobalAdjustments: []
    };
  }
  return {
    globalAdjustments: { ...adjustments, contrast: 18, highlights: -20, shadows: 14, saturation: -100, clarity: 8, texture: 12 },
    curves: { ...curves, rgb: curvePresets['S curve'] },
    disabledGlobalAdjustments: []
  };
}

function clampZoom(value: number): number {
  return Math.min(maximumZoom, Math.max(minimumZoom, value));
}

function availablePhotoStageSize(stage: HTMLDivElement): ImageDimensions {
  const styles = window.getComputedStyle(stage);
  const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
  const verticalPadding = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
  return {
    width: Math.max(1, stage.clientWidth - horizontalPadding),
    height: Math.max(1, stage.clientHeight - verticalPadding)
  };
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || (target instanceof HTMLElement && target.isContentEditable);
}

function editProposalFromAdvice(advice: AiDevelopmentAdvicePrimitives): EditProposal {
  return {
    suggestedIntent: advice.suggestedIntent,
    critique: advice.critique,
    strengths: [...advice.strengths],
    opportunities: [...advice.opportunities],
    explanation: advice.explanation,
    operations: structuredClone(advice.operations)
  };
}

export function EditorPage(): ReactElement {
  const { projectId = '' } = useParams();
  const application = useApplication();
  const navigate = useNavigate();
  const panGesture = useRef<PanGesture | null>(null);
  const brushGesture = useRef<BrushGesture | null>(null);
  const previewSurface = useRef<HTMLDivElement>(null);
  const photoStage = useRef<HTMLDivElement>(null);
  const guideFrame = useRef<HTMLDivElement>(null);
  const cropGesture = useRef<CropGesture | null>(null);
  const cropDraftValue = useRef<ViewportTransformPrimitives['cropFrame'] | null>(null);
  const exportAbort = useRef<AbortController | null>(null);
  const horizonAbort = useRef<AbortController | null>(null);
  const recipePresetInput = useRef<HTMLInputElement>(null);
  const semanticAbort = useRef<AbortController | null>(null);
  const semanticInstallAbort = useRef<AbortController | null>(null);
  const aiRequestActive = useRef(false);
  const renderSequence = useRef(0);
  const preserveViewportOnNextImageLoad = useRef(false);
  const previewRenderDebouncer = useRef<Debouncer<void> | null>(null);
  previewRenderDebouncer.current ??= new Debouncer(80);
  const [project, setProject] = useState<PhotoProject | null>(null);
  const [loadingSource, setLoadingSource] = useState<Blob | null>(null);
  const [beforeSource, setBeforeSource] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [cropPreview, setCropPreview] = useState<Blob | null>(null);
  const [cropPreviewBusy, setCropPreviewBusy] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [renderProgress, setRenderProgress] = useState('Preparing preview');
  const [renderBusy, setRenderBusy] = useState(true);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [previewAnalysis, setPreviewAnalysis] = useState<PreviewAnalysis | null>(null);
  const [revision, setRevision] = useState(0);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [fitDimensions, setFitDimensions] = useState<ImageDimensions | null>(null);
  const [panning, setPanning] = useState(false);
  const [cropDraft, setCropDraft] = useState<ViewportTransformPrimitives['cropFrame'] | null>(null);
  const [compositionGuide, setCompositionGuide] = useState<CompositionGuide>('none');
  const [maskOverlayVisible, setMaskOverlayVisible] = useState(true);
  const [selectedMaskId, setSelectedMaskId] = useState<string | null>(null);
  const [brushActive, setBrushActive] = useState(false);
  const [colorPointActive, setColorPointActive] = useState(false);
  const [aiPointActive, setAiPointActive] = useState(false);
  const [aiPointPolarity, setAiPointPolarity] = useState<AiPointPolarity>('positive');
  const [brushSize, setBrushSize] = useState(0.08);
  const [brushMode, setBrushMode] = useState<'add' | 'erase'>('add');
  const [activePanel, setActivePanel] = useState<EditorPanel>('ai');
  const [toolWorkspace, setToolWorkspace] = useState<ToolWorkspace>('ai');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('ai');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cloudStorageOpen, setCloudStorageOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('Choose a photographic format and output size.');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [photoInformationOpen, setPhotoInformationOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recipeCollapsed, setRecipeCollapsed] = useState(false);
  const [recipePresetMessage, setRecipePresetMessage] = useState<string | undefined>();
  const [recipePresets, setRecipePresets] = useState<RecipePreset[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessage, setAiMessage] = useState('Connect OpenAI API to request a visual opinion or an editable proposal. Cloud AI actions send only a reduced preview.');
  const [aiFailure, setAiFailure] = useState<string | null>(null);
  const [aiProposal, setAiProposal] = useState<EditProposal | null>(null);
  const [aiProposalId, setAiProposalId] = useState<string | null>(null);
  const [aiSelection, setAiSelection] = useState<Set<number>>(new Set());
  const [aiGenerating, setAiGenerating] = useState(false);
  const [pendingAiAction, setPendingAiAction] = useState<PendingAiAction>(null);
  const [semanticStatus, setSemanticStatus] = useState<SemanticModelStatus | 'checking'>('checking');
  const [semanticTask, setSemanticTask] = useState<SemanticModelTask>(null);
  const [semanticProgress, setSemanticProgress] = useState(0);
  const [semanticCategory, setSemanticCategory] = useState<SemanticMaskCategoryPrimitive>('sky');
  const [semanticMessage, setSemanticMessage] = useState('Preparing the verified local segmentation model automatically…');
  const [horizonBusy, setHorizonBusy] = useState(false);
  const [horizonMessage, setHorizonMessage] = useState('Local edge analysis can estimate a dominant horizon or architectural vertical.');
  const [loadError, setLoadError] = useState<string | null>(null);
  const cropWorkspaceActive = toolWorkspace === 'develop' && activePanel === 'crop';
  const displayedSource = showOriginal
    ? beforeSource
    : cropWorkspaceActive ? cropPreview ?? loadingSource : preview ?? loadingSource;
  const sourceUrl = useObjectUrl(displayedSource);
  const save = useCallback((active: PhotoProject) => application.saveProject.save(active), [application]);
  const autosave = useProjectAutosave(project, revision, save);
  const semanticDescriptor = application.manageSemanticSegmentationModel.describe();

  const prepareSemanticModel = useCallback(async (): Promise<void> => {
    if (semanticInstallAbort.current !== null) return;
    let controller: AbortController | null = null;
    try {
      const status = await application.manageSemanticSegmentationModel.inspect();
      setSemanticStatus(status);
      if (status !== 'not-installed') return;
      controller = new AbortController();
      semanticInstallAbort.current = controller;
      setSemanticTask('installing');
      setSemanticProgress(0);
      setSemanticMessage('Downloading and verifying the local segmentation model automatically…');
      await application.manageSemanticSegmentationModel.install({ signal: controller.signal, onProgress: setSemanticProgress });
      setSemanticStatus('installed');
      setSemanticProgress(1);
      setSemanticMessage('Local semantic selection is ready. The photograph never leaves this device.');
    } catch (error: unknown) {
      const status = await application.manageSemanticSegmentationModel.inspect().catch(() => 'unavailable' as const);
      setSemanticStatus(status);
      setSemanticMessage(error instanceof DOMException && error.name === 'AbortError'
        ? 'The local model download paused when this workspace closed.'
        : error instanceof Error ? `${error.message} Retry the local download below.` : 'The local semantic model could not be prepared.');
    } finally {
      if (semanticInstallAbort.current === controller) {
        semanticInstallAbort.current = null;
        setSemanticTask(null);
      }
    }
  }, [application]);

  useEffect(() => {
    let mounted = true;
    void application.manageRecipePresets.list().then((presets) => {
      if (mounted) setRecipePresets(presets);
    }).catch((error: unknown) => {
      if (mounted) setRecipePresetMessage(error instanceof Error ? error.message : 'Recipe presets could not be loaded.');
    });
    void prepareSemanticModel();
    return () => {
      mounted = false;
      semanticAbort.current?.abort();
      const installController = semanticInstallAbort.current;
      semanticInstallAbort.current = null;
      installController?.abort();
      horizonAbort.current?.abort();
    };
  }, [application, prepareSemanticModel]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setProject(null);
        setLoadingSource(null);
        setBeforeSource(null);
        setPreview(null);
        setPreviewAnalysis(null);
        setShowOriginal(false);
        setRenderBusy(true);
        setRenderProgress('Preparing preview');
        setBaselineError(null);
        const loaded = await application.findProject.find(new FindProjectMessage(projectId));
        if (loaded === null) {
          setLoadError('This project does not exist or has been deleted.');
          return;
        }
        const savedAdvice = loaded.getAiDevelopmentJournal().advice;
        const latestAdvice = savedAdvice.at(-1);
        if (latestAdvice !== undefined) setAiPrompt(latestAdvice.suggestedIntent);
        const pendingAdvice = [...savedAdvice].reverse().find((entry) => entry.status === 'proposed');
        if (pendingAdvice !== undefined) {
          setAiProposal(editProposalFromAdvice(pendingAdvice));
          setAiProposalId(pendingAdvice.id);
          setAiSelection(new Set(pendingAdvice.operations.map((_, index) => index)));
          setAiMessage('Restored an unapplied AI Companion proposal from this project.');
        }
        const original = await application.sourceFiles.find(loaded.getId());
        if (original !== null && loaded.getSource().getSupportedMimeType() === 'image/x-sony-arw') {
          const inspection = await application.inspectSourceImage.inspect(new InspectSourceImageMessage(original, loaded.getSource().getFileName().valueOf()));
          setLoadingSource(inspection.embeddedPreview);
        } else {
          setLoadingSource(original);
          setBeforeSource(original);
        }
        setProject(loaded);
      } catch (error: unknown) {
        setLoadError(error instanceof Error ? error.message : 'The project could not be opened.');
      }
    };
    void load();
  }, [application, projectId]);

  useEffect(() => {
    if (project === null) return;
    const sequence = renderSequence.current + 1;
    renderSequence.current = sequence;
    const controller = new AbortController();
    setRenderBusy(true);
    setRenderProgress('Waiting for input');
    void previewRenderDebouncer.current?.run(async () => {
      setRenderProgress('Rendering');
      const result = await application.renderProjectPreview.render(
        project,
        new RenderProjectPreviewMessage(projectId, 2560),
        {
          signal: controller.signal,
          onProgress: (progress) => {
            if (sequence === renderSequence.current) setRenderProgress(`${progress.stage} ${Math.round(progress.completed * 100)}%`);
          },
          onAnalysis: (analysis) => {
            if (sequence === renderSequence.current) setPreviewAnalysis(analysis);
          }
        }
      );
      if (result instanceof Blob && sequence === renderSequence.current) {
        setPreview(result);
        if (project.getSource().getSupportedMimeType() === 'image/x-sony-arw' && project.getRecipe().isVisuallyNeutral()) {
          setBeforeSource(result);
          setBaselineError(null);
        }
        setRenderProgress('Preview up to date');
        setRenderBusy(false);
      }
    }).catch((error: unknown) => {
      if (error instanceof FlowCancelledError) {
        if (sequence === renderSequence.current) setRenderBusy(false);
        return;
      }
      if (sequence === renderSequence.current && (!(error instanceof DOMException) || error.name !== 'AbortError')) {
        const message = error instanceof Error ? error.message : 'Unknown rendering error.';
        setRenderProgress(`Preview unavailable; showing original. ${message}`);
        setRenderBusy(false);
      }
    });
    return () => controller.abort();
  }, [application, previewRevision, project, projectId]);

  useEffect(() => {
    if (!cropWorkspaceActive || project === null) {
      setCropPreview(null);
      setCropPreviewBusy(false);
      return;
    }
    const controller = new AbortController();
    setCropPreviewBusy(true);
    void application.renderProjectCropPreview.render(
      project,
      new RenderProjectCropPreviewMessage(projectId, 2560),
      { signal: controller.signal }
    ).then((result) => {
      if (result instanceof Blob) setCropPreview(result);
      setCropPreviewBusy(false);
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException) || error.name !== 'AbortError') setCropPreviewBusy(false);
    });
    return () => controller.abort();
  }, [application, cropWorkspaceActive, previewRevision, project, projectId]);

  useEffect(() => () => previewRenderDebouncer.current?.cancel(), []);

  useEffect(() => {
    if (project === null
      || beforeSource !== null
      || project.getSource().getSupportedMimeType() !== 'image/x-sony-arw'
      || project.getRecipe().isVisuallyNeutral()) return;
    const controller = new AbortController();
    setBaselineError(null);
    void application.renderProjectBaseline.render(
      project,
      new RenderProjectBaselineMessage(projectId, 2560),
      { signal: controller.signal }
    ).then((result) => {
      if (result instanceof Blob) {
        setBeforeSource(result);
        setBaselineError(null);
      }
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException) || error.name !== 'AbortError') {
        setBaselineError(error instanceof Error ? error.message : 'The neutral RAW baseline could not be rendered.');
      }
    });
    return () => controller.abort();
  }, [application, beforeSource, previewRevision, project, projectId]);

  const apply = useCallback((operation: EditOperation): void => {
    if (project === null) return;
    application.applyEditOperation.apply(project, new ApplyEditOperationMessage(projectId, operation));
    setRevision((current) => current + 1);
    if (operation.kind !== EDIT_OPERATION.RENAME_PROJECT
      && operation.kind !== EDIT_OPERATION.SET_PROJECT_RATING
      && operation.kind !== EDIT_OPERATION.SET_PROJECT_TAGS
      && operation.kind !== EDIT_OPERATION.SET_PROJECT_FAVORITE) {
      setPreviewRevision((current) => current + 1);
    }
  }, [application, project, projectId]);

  const changeHistory = useCallback((direction: 'undo' | 'redo'): void => {
    if (project === null) return;
    const message = new ChangeHistoryMessage(projectId);
    if (direction === 'undo') application.changeHistory.undo(project, message);
    else application.changeHistory.redo(project, message);
    setRevision((current) => current + 1);
    setPreviewRevision((current) => current + 1);
  }, [application, project, projectId]);

  const calculateFitDimensions = useCallback((dimensions: ImageDimensions | null = imageDimensions): ImageDimensions | null => {
    const stage = photoStage.current;
    if (stage === null || dimensions === null) return null;
    const available = availablePhotoStageSize(stage);
    const scale = Math.min(available.width / dimensions.width, available.height / dimensions.height, 1);
    const fitted = { width: Math.max(1, dimensions.width * scale), height: Math.max(1, dimensions.height * scale) };
    setFitDimensions(fitted);
    return fitted;
  }, [imageDimensions]);

  const frameCropPreview = useCallback((fitted: ImageDimensions): void => {
    const stage = photoStage.current;
    if (stage === null || project === null) return;
    const crop = project.getViewportTransform().toPrimitives().cropFrame;
    const available = availablePhotoStageSize(stage);
    const nextZoom = clampZoom(Math.min(
      available.width / Math.max(1, fitted.width * crop.width),
      available.height / Math.max(1, fitted.height * crop.height)
    ));
    setZoom(nextZoom);
    setPan({
      x: -(crop.x + crop.width / 2 - 0.5) * fitted.width * nextZoom,
      y: -(crop.y + crop.height / 2 - 0.5) * fitted.height * nextZoom
    });
  }, [project]);

  const fitPreview = useCallback((): void => {
    const fitted = calculateFitDimensions();
    if (fitted !== null && cropWorkspaceActive) frameCropPreview(fitted);
    else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [calculateFitDimensions, cropWorkspaceActive, frameCropPreview]);

  useEffect(() => {
    const stage = photoStage.current;
    if (stage === null || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => calculateFitDimensions());
    observer.observe(stage);
    return () => observer.disconnect();
  }, [calculateFitDimensions]);

  const openPanel = useCallback((panel: EditorPanel): void => {
    setActivePanel(panel);
    setToolWorkspace(panel === 'ai' ? 'ai' : 'develop');
    setInspectorTab(panel === 'ai' ? 'ai' : panel === 'masks' ? 'masks' : panel === 'crop' ? 'crop' : 'edit');
    window.requestAnimationFrame(() => document.getElementById(`tool-${panel}`)?.scrollIntoView({ block: 'start' }));
  }, []);

  const selectInspectorTab = (tab: InspectorTab): void => {
    if (tab === 'edit') openPanel(activePanel === 'color' || activePanel === 'detail' || activePanel === 'curves' ? activePanel : 'light');
    else if (tab === 'crop') openPanel('crop');
    else if (tab === 'masks') openPanel('masks');
    else if (tab === 'ai') openPanel('ai');
    else {
      setInspectorTab('history');
      setToolWorkspace('develop');
    }
  };

  const toggleComparison = useCallback((): void => {
    preserveViewportOnNextImageLoad.current = true;
    setShowOriginal((value) => !value);
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
      else if (event.key === '1') openPanel('light');
      else if (event.key === '2') openPanel('color');
      else if (event.key === '3') openPanel('detail');
      else if (event.key === '4') openPanel('curves');
      else if (event.key.toLowerCase() === 'a') openPanel('ai');
      else if (event.key.toLowerCase() === 'b' && beforeSource !== null) toggleComparison();
      else if (event.key.toLowerCase() === 'g') setCompositionGuide((current) => compositionGuideSequence[(compositionGuideSequence.indexOf(current) + 1) % compositionGuideSequence.length] ?? 'none');
      else if (event.key.toLowerCase() === 'm') openPanel('masks');
      else if (event.key.toLowerCase() === 'r') setInspectorTab('history');
      else if (event.key.toLowerCase() === 'i') setPhotoInformationOpen(true);
      else if (event.key.toLowerCase() === 'h') setHistoryOpen(true);
      else if (event.key === 'Escape') { setBrushActive(false); setColorPointActive(false); setAiPointActive(false); }
      else if (event.key === '?') setShortcutsOpen((value) => !value);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [beforeSource, changeHistory, fitPreview, openPanel, settingsOpen, toggleComparison]);

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

  const uploadProjectBundleToDrive = async (): Promise<void> => {
    if (project === null) return;
    await autosave.flush();
    const bundle = await application.projectExporter.exportProject(project.getId());
    const name = `${project.getName().valueOf().replace(/[^a-z0-9-_]+/gi, '-') || 'project'}.rawcket`;
    await application.manageCloudStorage.upload(new UploadCloudAssetMessage(name, bundle, 'project-bundle'));
  };

  const uploadOriginalToDrive = async (): Promise<void> => {
    if (project === null) return;
    const original = await application.sourceFiles.find(project.getId());
    if (original === null) throw new Error('The original photograph is unavailable locally.');
    await application.manageCloudStorage.upload(new UploadCloudAssetMessage(project.getSource().getFileName().valueOf(), original, 'original'));
  };

  const importRecipePreset = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;
    try {
      const preset = await application.manageRecipePresets.import(new ImportRecipePresetMessage(crypto.randomUUID(), file));
      setRecipePresets((current) => [preset, ...current]);
      setRecipePresetMessage(`${preset.getName().valueOf()} imported into My presets.`);
    } catch (error: unknown) {
      setRecipePresetMessage(error instanceof Error ? error.message : 'The recipe preset could not be imported.');
    }
  };

  const exportPhoto = async (settings: PhotoExportSettings): Promise<void> => {
    if (project === null) return;
    const controller = new AbortController();
    exportAbort.current = controller;
    setExportBusy(true);
    setExportProgress(0);
    setExportMessage('Preparing full recipe…');
    try {
      await autosave.flush();
      const image = await application.exportProjectPhoto.export(
        project,
        new ExportProjectPhotoMessage(projectId, settings.format, settings.quality, settings.maximumEdge, settings.outputSharpening, settings.watermark, settings.metadataPolicy),
        {
          signal: controller.signal,
          onProgress: (progress) => {
            setExportProgress(progress.completed);
            setExportMessage(`${progress.stage[0]?.toUpperCase() ?? ''}${progress.stage.slice(1)} · ${Math.round(progress.completed * 100)}%`);
          }
        }
      );
      const safeName = project.getName().valueOf().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'rawcket-photo';
      const extension = settings.format === 'jpeg' ? 'jpg' : settings.format === 'tiff' ? 'tif' : 'png';
      downloadBlob(image, `${safeName}.${extension}`);
      const cloud = await application.manageCloudStorage.inspect();
      if (cloud.connected && cloud.autoUploadExports) {
        setExportMessage('Photo exported locally · uploading to Google Drive…');
        try {
          await application.manageCloudStorage.upload(new UploadCloudAssetMessage(`${safeName}.${extension}`, image, 'photo-export'));
          setExportMessage('Photo exported locally and uploaded to Google Drive.');
        } catch (error: unknown) {
          const detail = error instanceof Error ? error.message : 'The Drive copy could not be uploaded.';
          setExportMessage(`Photo exported locally. Google Drive upload failed: ${detail}`);
        }
      } else setExportMessage('Photo exported successfully.');
      setExportProgress(1);
    } catch (error: unknown) {
      setExportMessage(error instanceof DOMException && error.name === 'AbortError' ? 'Export cancelled.' : error instanceof Error ? error.message : 'The photo could not be exported.');
    } finally {
      exportAbort.current = null;
      setExportBusy(false);
    }
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
    openPanel(section);
  };

  const applyBuiltInPreset = (name: BuiltInPresetName): void => {
    apply({
      kind: EDIT_OPERATION.REPLACE_DEVELOPMENT_SETTINGS,
      settings: builtInPreset(name),
      groupId: null
    });
    setRecipePresetMessage(`${name} applied as one reversible recipe operation.`);
  };

  const createRecipePreset = async (name: string): Promise<void> => {
    if (project === null) return;
    try {
      const preset = await application.manageRecipePresets.create(project, new CreateRecipePresetMessage(projectId, crypto.randomUUID(), name));
      setRecipePresets((current) => [preset, ...current]);
      setRecipePresetMessage(`${preset.getName().valueOf()} saved in this browser.`);
    } catch (error: unknown) { setRecipePresetMessage(error instanceof Error ? error.message : 'The preset could not be saved.'); }
  };

  const updateRecipePreset = async (preset: RecipePreset, name: string, replaceRecipe: boolean): Promise<void> => {
    if (project === null) return;
    try {
      await application.manageRecipePresets.update(project, preset, new UpdateRecipePresetMessage(projectId, preset.getId().valueOf(), name, replaceRecipe));
      setRecipePresets((current) => [...current]);
      setRecipePresetMessage(`${preset.getName().valueOf()} ${replaceRecipe ? 'updated from the active recipe' : 'renamed'}.`);
    } catch (error: unknown) { setRecipePresetMessage(error instanceof Error ? error.message : 'The preset could not be updated.'); }
  };

  const deleteRecipePreset = async (preset: RecipePreset): Promise<void> => {
    try {
      await application.manageRecipePresets.remove(new DeleteRecipePresetMessage(preset.getId().valueOf()));
      setRecipePresets((current) => current.filter((candidate) => !candidate.isIdentifiedBy(preset.getId())));
      setRecipePresetMessage(`${preset.getName().valueOf()} deleted from this browser.`);
    } catch (error: unknown) { setRecipePresetMessage(error instanceof Error ? error.message : 'The preset could not be deleted.'); }
  };

  const exportRecipePreset = (preset: RecipePreset): void => {
    const blob = application.manageRecipePresets.export(preset, new ExportRecipePresetMessage(preset.getId().valueOf()));
    const safeName = preset.getName().valueOf().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'recipe';
    downloadBlob(blob, `${safeName}.rawcket-recipe.json`);
    setRecipePresetMessage(`${preset.getName().valueOf()} exported without a source image or project history.`);
  };

  const chooseCurvePreset = (name: keyof typeof curvePresets): void => {
    apply({
      kind: EDIT_OPERATION.SET_CURVE,
      channel: 'rgb',
      curve: curvePresets[name],
      groupId: null
    });
  };

  const changeCurve = (
    channel: 'rgb' | 'red' | 'green' | 'blue' | 'luminance',
    curve: ToneCurvePrimitives | null,
    groupId: string | null
  ): void => {
    apply({ kind: EDIT_OPERATION.SET_CURVE, channel, curve, groupId });
  };

  const changeViewport = (viewport: ViewportTransformPrimitives, groupId: string | null): void => {
    apply({ kind: EDIT_OPERATION.SET_VIEWPORT_TRANSFORM, viewport, groupId });
  };

  const autoStraighten = async (): Promise<void> => {
    if (beforeSource === null || project === null || horizonBusy) return;
    horizonAbort.current?.abort();
    const controller = new AbortController();
    horizonAbort.current = controller;
    setHorizonBusy(true);
    setHorizonMessage('Analyzing strong horizontal and vertical edges locally…');
    try {
      const estimate = await application.estimateHorizon.estimate(new EstimateHorizonMessage(beforeSource), controller.signal);
      if (!estimate.reliable) {
        setHorizonMessage('No reliable horizon was found. Use the dense grid and exact rotation control.');
        return;
      }
      const viewport = project.getViewportTransform().toPrimitives();
      const rotationDegrees = Math.min(180, Math.max(-180, Math.round((viewport.rotationDegrees + estimate.correctionDegrees) * 10) / 10));
      changeViewport({ ...viewport, rotationDegrees }, null);
      setHorizonMessage(`Applied ${estimate.correctionDegrees > 0 ? '+' : ''}${estimate.correctionDegrees.toFixed(1)}° from local edge evidence · ${Math.round(estimate.confidence * 100)}% directional confidence.`);
    } catch (error: unknown) {
      setHorizonMessage(error instanceof DOMException && error.name === 'AbortError'
        ? 'Horizon estimation cancelled.'
        : error instanceof Error ? error.message : 'The horizon could not be estimated.');
    } finally {
      horizonAbort.current = null;
      setHorizonBusy(false);
    }
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
    setColorPointActive(false);
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
    setColorPointActive(false);
    setAiPointActive(false);
  };

  const addLinearMask = (): void => {
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
        shape: { kind: 'linear-gradient', start: { x: 0.5, y: 0.2 }, end: { x: 0.5, y: 0.8 } }
      }
    });
    setSelectedMaskId(id);
    setBrushActive(false);
    setColorPointActive(false);
    setAiPointActive(false);
  };

  const addLuminanceMask = (): void => {
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
        shape: { kind: 'luminance-range', minimum: 0.55, maximum: 1 }
      }
    });
    setSelectedMaskId(id);
    setBrushActive(false);
    setColorPointActive(false);
    setAiPointActive(false);
  };

  const addColorMask = (): void => {
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
        shape: { kind: 'color-range', samples: [{ x: 0.5, y: 0.5 }], tolerance: 0.12 }
      }
    });
    setSelectedMaskId(id);
    setBrushActive(false);
    setColorPointActive(true);
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
    setColorPointActive(false);
    setAiPointActive(true);
  };

  const removeSemanticModel = async (): Promise<void> => {
    if (semanticTask !== null) return;
    try {
      await application.manageSemanticSegmentationModel.remove();
      setSemanticStatus('not-installed');
      setSemanticProgress(0);
      setSemanticMessage('The local model cache was removed. RAWcket will download it again automatically the next time local segmentation starts.');
    } catch (error: unknown) {
      setSemanticMessage(error instanceof Error ? error.message : 'The local semantic model could not be removed.');
    }
  };

  const generateSemanticMask = async (): Promise<void> => {
    if (project === null || preview === null || semanticTask !== null) return;
    const controller = new AbortController();
    const maskId = crypto.randomUUID();
    semanticAbort.current = controller;
    setSemanticTask('segmenting');
    setSemanticProgress(0);
    setSemanticMessage(`Finding ${semanticCategory} locally…`);
    try {
      const mask = await application.createSemanticMask.create(
        project,
        new CreateSemanticMaskMessage(projectId, maskId, semanticCategory, preview),
        { signal: controller.signal, onProgress: setSemanticProgress }
      );
      apply({ kind: EDIT_OPERATION.ADD_MASK, mask: mask.toPrimitives(), groupId: null });
      setSelectedMaskId(maskId);
      setBrushActive(false);
      setColorPointActive(false);
      setAiPointActive(false);
      setSemanticProgress(1);
      setSemanticMessage(`${semanticCategory[0]?.toUpperCase() ?? ''}${semanticCategory.slice(1)} mask created as editable recipe data.`);
      openPanel('masks');
    } catch (error: unknown) {
      setSemanticMessage(error instanceof DOMException && error.name === 'AbortError'
        ? 'Semantic selection cancelled.'
        : error instanceof Error ? error.message : 'The semantic mask could not be created.');
    } finally {
      semanticAbort.current = null;
      setSemanticTask(null);
    }
  };

  const selectMask = (id: string): void => {
    setSelectedMaskId(id);
    setBrushActive(false);
    setColorPointActive(false);
    setAiPointActive(false);
  };

  const generateAiProposal = async (request: string, pendingAction: Exclude<PendingAiAction, null>): Promise<void> => {
    if (project === null || preview === null || aiRequestActive.current) return;
    aiRequestActive.current = true;
    setAiFailure(null);
    try {
      const configuration = await application.inspectAiConfiguration.inspect();
      if (!configuration.ready) {
        setPendingAiAction(pendingAction);
        setAiMessage(pendingAction === 'opinion'
          ? 'Configure OpenAI API to ask for an opinion. RAWcket will continue afterwards.'
          : 'Configure OpenAI API to generate this proposal. Your written brief will be kept.');
        setSettingsOpen(true);
        return;
      }
      setAiGenerating(true);
      setAiMessage(pendingAction === 'opinion'
        ? 'Reviewing the photograph and writing an editable intent and proposal in one request…'
        : 'Turning your written intent into an editable proposal with crop, curves, geometry, and local masks…');
      const proposal = await application.requestEditingAdvice.propose(
        project,
        new RequestEditingAdviceMessage(
          projectId,
          request,
          preview,
          previewAnalysis?.shadowClipping ?? 0,
          previewAnalysis?.highlightClipping ?? 0
        )
      );
      if (aiProposalId !== null) {
        application.decideAiDevelopmentAdvice.decide(project, new DecideAiDevelopmentAdviceMessage(projectId, aiProposalId, 'rejected'));
      }
      const adviceId = crypto.randomUUID();
      application.recordAiDevelopmentAdvice.record(project, new RecordAiDevelopmentAdviceMessage(
        projectId,
        adviceId,
        request,
        proposal.suggestedIntent,
        proposal.critique,
        proposal.strengths,
        proposal.opportunities,
        proposal.explanation,
        proposal.operations
      ));
      if (pendingAction === 'opinion') setAiPrompt(proposal.suggestedIntent);
      setAiProposal(proposal);
      setAiProposalId(adviceId);
      setAiSelection(new Set(proposal.operations.map((_, index) => index)));
      setRevision((current) => current + 1);
      setAiMessage('Opinion and editable proposal ready. Review every operation before applying it.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'The proposal could not be generated.';
      setAiFailure(message);
      setAiMessage('No recipe was created. The current image and recipe were not changed.');
    } finally {
      aiRequestActive.current = false;
      setAiGenerating(false);
    }
  };

  const applyClassicAutoEnhance = (): void => {
    if (project === null || previewAnalysis === null) {
      setAiMessage('Auto Enhance needs the rendered histogram before it can make a safe correction.');
      return;
    }
    const suggestion = application.suggestAutomaticEnhancement.suggest(
      project,
      new SuggestAutomaticEnhancementMessage(projectId, previewAnalysis.shadowClipping, previewAnalysis.highlightClipping)
    );
    if (suggestion.operation !== null) apply(suggestion.operation);
    setAiMessage(suggestion.explanation);
  };

  const continuePendingAiAction = (): void => {
    const pending = pendingAiAction;
    setPendingAiAction(null);
    if (pending === 'opinion') void generateAiProposal('', 'opinion');
    if (pending === 'prompt') void generateAiProposal(aiPrompt, 'prompt');
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
      if (operation.kind === EDIT_OPERATION.ADD_MASK) setSelectedMaskId(operation.mask.id);
      apply(operation);
    });
    if (project !== null && aiProposalId !== null) {
      application.decideAiDevelopmentAdvice.decide(project, new DecideAiDevelopmentAdviceMessage(projectId, aiProposalId, 'applied'));
      setRevision((current) => current + 1);
    }
    setAiProposal(null);
    setAiProposalId(null);
    setAiSelection(new Set());
    setAiMessage('The selected operations were applied through the same reversible history as manual edits.');
  };

  const rejectAiProposal = (): void => {
    if (project !== null && aiProposalId !== null) {
      application.decideAiDevelopmentAdvice.decide(project, new DecideAiDevelopmentAdviceMessage(projectId, aiProposalId, 'rejected'));
      setRevision((current) => current + 1);
    }
    setAiProposal(null);
    setAiProposalId(null);
    setAiSelection(new Set());
    setAiMessage('Proposal rejected. The project was not changed. The Companion review remains in project history.');
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
    setColorPointActive(false);
    setAiPointActive(false);
  };

  const composeMasks = (maskIds: string[], operation: MaskCompositionOperationPrimitive): void => {
    const compositeMaskId = crypto.randomUUID();
    apply({ kind: EDIT_OPERATION.COMPOSE_MASKS, compositeMaskId, maskIds, operation, groupId: null });
    setSelectedMaskId(compositeMaskId);
    setBrushActive(false);
    setColorPointActive(false);
    setAiPointActive(false);
  };

  const decomposeMask = (compositeMaskId: string): void => {
    const composite = project?.getMasks().find((mask) => mask.getId().valueOf() === compositeMaskId)?.toPrimitives();
    const firstChildId = composite?.shape.kind === 'composite' ? composite.shape.children[0]?.id ?? null : null;
    apply({ kind: EDIT_OPERATION.DECOMPOSE_MASK, compositeMaskId, groupId: null });
    setSelectedMaskId(firstChildId);
    setBrushActive(false);
    setColorPointActive(false);
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
        strokes: [...selected.shape.strokes, {
          points: [{ ...point, pressure: pointerPressure(event) }],
          size: brushSize,
          hardness: 0.75,
          flow: 1,
          mode: brushMode
        }]
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
      shape: aiPointPolarity === 'positive'
        ? { ...selected.shape, positivePoints: [...selected.shape.positivePoints, point] }
        : { ...selected.shape, negativePoints: [...selected.shape.negativePoints, point] }
    }, null);
    return true;
  };

  const addColorPoint = (event: ReactPointerEvent<HTMLDivElement>): boolean => {
    if (!colorPointActive || selectedMaskId === null) return false;
    const selected = project?.getMasks().find((mask) => mask.getId().valueOf() === selectedMaskId)?.toPrimitives();
    const point = pointOnPreview(event);
    if (selected?.shape.kind !== 'color-range' || point === null) return true;
    if (selected.shape.samples.some((sample) => Math.hypot(sample.x - point.x, sample.y - point.y) < 0.002)) return true;
    updateMask({ ...selected, shape: { ...selected.shape, samples: [...selected.shape.samples, point] } }, null);
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
    strokes[strokes.length - 1] = { ...current, points: [...current.points, { ...point, pressure: pointerPressure(event) }] };
    updateMask({ ...selected, shape: { ...selected.shape, strokes } }, gesture.groupId);
    return true;
  };

  const pointOnCropFrame = (event: ReactPointerEvent<HTMLDivElement>): { x: number; y: number } | null => {
    const bounds = guideFrame.current?.getBoundingClientRect();
    if (bounds === undefined || bounds.width === 0 || bounds.height === 0) return null;
    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
    };
  };

  const beginCrop = (event: ReactPointerEvent<HTMLDivElement>): boolean => {
    if (toolWorkspace !== 'develop' || activePanel !== 'crop') return false;
    const start = pointOnCropFrame(event);
    const bounds = guideFrame.current?.getBoundingClientRect();
    if (start === null || bounds === undefined || project === null) return true;
    const current = project.getViewportTransform().toPrimitives().cropFrame;
    const horizontalTolerance = 18 / bounds.width;
    const verticalTolerance = 18 / bounds.height;
    const corners = [
      { handle: 'top-left', point: { x: current.x, y: current.y }, opposite: { x: current.x + current.width, y: current.y + current.height } },
      { handle: 'top-right', point: { x: current.x + current.width, y: current.y }, opposite: { x: current.x, y: current.y + current.height } },
      { handle: 'bottom-left', point: { x: current.x, y: current.y + current.height }, opposite: { x: current.x + current.width, y: current.y } },
      { handle: 'bottom-right', point: { x: current.x + current.width, y: current.y + current.height }, opposite: { x: current.x, y: current.y } }
    ];
    const requestedHandle = event.target instanceof HTMLElement ? event.target.dataset.cropHandle : undefined;
    const resizeCorner = corners.find((corner) => corner.handle === requestedHandle)
      ?? corners.find((corner) => Math.abs(start.x - corner.point.x) <= horizontalTolerance && Math.abs(start.y - corner.point.y) <= verticalTolerance);
    const movingExistingCrop = resizeCorner === undefined
      && !CropFrameProjector.fillsImage(current)
      && CropFrameProjector.contains(current, start);
    cropGesture.current = movingExistingCrop
      ? { kind: 'move', pointerId: event.pointerId, pointerStart: start, cropStart: current }
      : { kind: 'draw', pointerId: event.pointerId, anchor: resizeCorner?.opposite ?? start };
    const draft = movingExistingCrop || resizeCorner !== undefined
      ? current
      : { x: start.x, y: start.y, width: 0, height: 0 };
    cropDraftValue.current = draft;
    setCropDraft(draft);
    event.currentTarget.setPointerCapture(event.pointerId);
    return true;
  };

  const continueCrop = (event: ReactPointerEvent<HTMLDivElement>): boolean => {
    const gesture = cropGesture.current;
    if (gesture?.pointerId !== event.pointerId) return false;
    const end = pointOnCropFrame(event);
    if (end === null || project === null) return true;
    const viewport = project.getViewportTransform().toPrimitives();
    const draft = gesture.kind === 'move'
      ? CropFrameProjector.move(gesture.cropStart, gesture.pointerStart, end)
      : CropFrameProjector.draw(gesture.anchor, end, viewport.aspectRatio, project.toPrimitives().metadata);
    cropDraftValue.current = draft;
    setCropDraft(draft);
    return true;
  };

  const startPan = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;
    if (beginCrop(event)) return;
    if (addColorPoint(event)) return;
    if (addAiPoint(event)) return;
    if (beginBrushStroke(event)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    panGesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, ...pan };
    setPanning(true);
  };

  const movePan = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (continueCrop(event)) return;
    if (continueBrushStroke(event)) return;
    const gesture = panGesture.current;
    if (gesture?.pointerId !== event.pointerId) return;
    setPan({
      x: gesture.x + event.clientX - gesture.startX,
      y: gesture.y + event.clientY - gesture.startY
    });
  };

  const endPan = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (cropGesture.current?.pointerId === event.pointerId) {
      const nextCrop = cropDraftValue.current;
      cropGesture.current = null;
      cropDraftValue.current = null;
      setCropDraft(null);
      if (nextCrop !== null && nextCrop.width >= 0.02 && nextCrop.height >= 0.02 && project !== null) {
        const viewport = project.getViewportTransform().toPrimitives();
        changeViewport({ ...viewport, cropFrame: nextCrop }, null);
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
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

  const rotateContextualCrop = (delta: number): void => {
    if (project === null) return;
    const viewport = project.getViewportTransform().toPrimitives();
    const next = ((viewport.rotationDegrees + delta + 180) % 360) - 180;
    changeViewport({ ...viewport, rotationDegrees: next }, null);
  };

  const clearContextualCrop = (): void => {
    if (project === null) return;
    const viewport = project.getViewportTransform().toPrimitives();
    changeViewport({ ...viewport, cropFrame: { x: 0, y: 0, width: 1, height: 1 }, aspectRatio: null }, null);
  };

  const zoomWithWheel = (event: WheelEvent<HTMLDivElement>): void => {
    event.preventDefault();
    changeZoom(zoom * (event.deltaY < 0 ? 1.1 : 0.9));
  };

  const previewLoaded = (image: HTMLImageElement): void => {
    const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
    const preserveViewport = preserveViewportOnNextImageLoad.current;
    preserveViewportOnNextImageLoad.current = false;
    if (imageDimensions?.width === dimensions.width && imageDimensions.height === dimensions.height) return;
    if (preserveViewport && imageDimensions !== null
      && Math.abs(imageDimensions.width / imageDimensions.height - dimensions.width / dimensions.height) < 0.0001) return;
    setImageDimensions(dimensions);
    window.requestAnimationFrame(() => {
      const fitted = calculateFitDimensions(dimensions);
      if (preserveViewport) return;
      if (fitted !== null && cropWorkspaceActive) frameCropPreview(fitted);
      else {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    });
  };

  if (loadError !== null) {
    return <main className="centered-state"><h1>Unable to open</h1><p>{loadError}</p><button className="button primary" onClick={() => void navigate('/')}>Back to library</button></main>;
  }
  if (project === null) return <main className="centered-state"><div className="loader" /><p>Opening local project…</p></main>;

  const projectMasks = project.getMasks().map((mask) => mask.toPrimitives());
  const selectedMaskIndex = projectMasks.findIndex((mask) => mask.id === selectedMaskId);
  const selectedMask = selectedMaskIndex < 0 ? null : projectMasks[selectedMaskIndex] ?? null;
  const aiDevelopmentHistory = [...project.getAiDevelopmentJournal().advice].reverse();
  const statusLabel = autosave.status === 'saved' ? 'Saved locally' : autosave.status === 'saving' ? 'Saving…' : 'Save failed';
  const transform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`;
  const sourcePrecisionLabel = previewAnalysis?.sourcePrecision === 'raw-linear-16-bit'
    ? '16-bit linear LibRaw source'
    : previewAnalysis?.sourcePrecision === 'embedded-preview-8-bit'
      ? '8-bit embedded-preview fallback'
      : previewAnalysis === null ? 'Source precision pending' : '8-bit browser source';
  const rawSource = project.getSource().getSupportedMimeType() === 'image/x-sony-arw';
  const comparisonHasDifference = !project.getRecipe().isVisuallyNeutral();
  const comparisonReady = beforeSource !== null && comparisonHasDifference;

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <button className="icon-button back-button" type="button" onClick={() => void close()} aria-label="Close project and return">←</button>
        <div className="project-title-block">
          <input className="project-title-input" aria-label="Project name" defaultValue={project.getName().valueOf()} onBlur={(event) => rename(event.target.value)} onKeyDown={handleNameKey} />
          <span className={`save-status ${autosave.status}`} aria-live="polite"><span aria-hidden="true">●</span> {statusLabel}</span>
        </div>
        <div className="history-actions">
          <button className="icon-button" type="button" disabled={!project.canUndo()} onClick={() => changeHistory('undo')} aria-label="Undo">↶</button>
          <button className="icon-button" type="button" disabled={!project.canRedo()} onClick={() => changeHistory('redo')} aria-label="Redo">↷</button>
        </div>
        <button className={`button compare-header ${showOriginal ? 'active' : ''}`} type="button" disabled={!comparisonReady} title={!comparisonHasDifference ? 'Before and After match because the recipe has no enabled edits.' : baselineError !== null ? `Before preview unavailable: ${baselineError}` : beforeSource === null ? 'Preparing the neutral developed RAW baseline' : 'Compare with the neutral developed baseline'} onClick={toggleComparison}>{showOriginal ? 'Before' : 'After'} <span>B</span></button>
        <details className="editor-more-menu">
          <summary role="button" aria-label="Editor menu" title="Editor menu">•••</summary>
          <div>
            <button type="button" onClick={() => setCloudStorageOpen(true)}>Sync &amp; Google Drive</button>
            <button type="button" onClick={() => setPhotoInformationOpen(true)}>Photo information</button>
            <button type="button" onClick={() => setShortcutsOpen(true)}>Keyboard shortcuts</button>
            <button type="button" onClick={() => setHistoryOpen(true)}>Full visual history</button>
          </div>
        </details>
        <button className="button primary" type="button" onClick={() => setExportOpen(true)}>Export</button>
      </header>
      <input ref={recipePresetInput} className="visually-hidden" type="file" accept=".rawcket-recipe.json,application/json" aria-label="Select a RAWcket recipe preset" onChange={(event) => void importRecipePreset(event)} />
      {autosave.error !== null && <p className="editor-error" role="alert">{autosave.error}</p>}
      <section className={`editor-workspace ${recipeCollapsed ? 'recipe-collapsed' : ''}`}>
        <ActiveRecipePanel
          collapsed={recipeCollapsed}
          onToggleCollapsed={() => setRecipeCollapsed((collapsed) => !collapsed)}
          project={project}
          onNavigate={showAdjustment}
          onToggle={toggleAdjustment}
          onNavigateTool={openPanel}
          onApplyPreset={applyBuiltInPreset}
          onClear={() => apply({ kind: EDIT_OPERATION.REPLACE_RECIPE, recipe: DevelopmentRecipe.neutral().toPrimitives(), groupId: null })}
          customPresets={recipePresets}
          onCreatePreset={(name) => void createRecipePreset(name)}
          onApplyCustomPreset={(preset) => { apply({ kind: EDIT_OPERATION.REPLACE_RECIPE, recipe: preset.getRecipe().toPrimitives(), groupId: null }); setRecipePresetMessage(`${preset.getName().valueOf()} applied as one reversible recipe operation.`); }}
          onRenameCustomPreset={(preset, name) => void updateRecipePreset(preset, name, false)}
          onUpdateCustomPreset={(preset) => void updateRecipePreset(preset, preset.getName().valueOf(), true)}
          onExportCustomPreset={exportRecipePreset}
          onDeleteCustomPreset={(preset) => void deleteRecipePreset(preset)}
          onImportPreset={() => recipePresetInput.current?.click()}
          presetMessage={recipePresetMessage}
        />
        <div className="canvas-area">
          <div className="canvas-toolbar" aria-label="Preview controls">
            <button type="button" onClick={() => changeZoom(zoom - 0.1)} aria-label="Zoom out">−</button>
            <input aria-label="Preview zoom" type="range" min={minimumZoom} max={maximumZoom} step="0.05" value={zoom} onChange={(event) => changeZoom(event.currentTarget.valueAsNumber)} />
            <label><span className="visually-hidden">Zoom percentage</span><input type="number" min={10} max={800} step={1} value={Math.round(zoom * 100)} onChange={(event) => changeZoom(event.currentTarget.valueAsNumber / 100)} />%</label>
            <button type="button" onClick={() => changeZoom(zoom + 0.1)} aria-label="Zoom in">+</button>
            <button type="button" onClick={fitPreview}>Fit</button>
            <select aria-label="Composition guide" value={compositionGuide} onChange={(event) => setCompositionGuide(event.target.value as CompositionGuide)} title="Composition overlay">
              <option value="none">No guide</option><option value="thirds">Thirds · image</option><option value="grid">Grid · workspace</option><option value="diagonals">Diagonals · workspace</option><option value="golden-ratio">Golden · image</option>
            </select>
            {project.hasMasks() && <button className={maskOverlayVisible ? 'active' : ''} aria-pressed={maskOverlayVisible} type="button" onClick={() => setMaskOverlayVisible((value) => !value)} title="Show or hide the editable mask overlay">Mask</button>}
          </div>
          {toolWorkspace === 'develop' && activePanel === 'crop' && <div className="contextual-canvas-tools crop-tools" role="toolbar" aria-label="Contextual crop tools">
            <span><strong>Crop</strong><small>Drag outside to draw · drag inside to move · drag corners to resize</small></span>
            <button type="button" onClick={() => rotateContextualCrop(-90)} aria-label="Rotate crop left 90 degrees">↶ 90°</button>
            <button type="button" onClick={() => rotateContextualCrop(90)} aria-label="Rotate crop right 90 degrees">↷ 90°</button>
            <button type="button" disabled={horizonBusy} onClick={() => void autoStraighten()}>{horizonBusy ? 'Analyzing…' : 'Straighten · local'}</button>
            <button type="button" onClick={clearContextualCrop}>Clear crop</button>
          </div>}
          <div
            ref={photoStage}
            className={`photo-stage ${panning ? 'panning' : ''} ${brushActive || colorPointActive || aiPointActive || (toolWorkspace === 'develop' && activePanel === 'crop') ? 'painting' : ''}`}
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={endPan}
            onPointerCancel={endPan}
            onWheel={zoomWithWheel}
            aria-label="Photo preview. Drag to pan and use the mouse wheel to zoom."
          >
            {sourceUrl !== null && (
              <div ref={previewSurface} className="preview-surface" style={{ transform, width: fitDimensions?.width, height: fitDimensions?.height, maxWidth: fitDimensions === null ? undefined : 'none', maxHeight: fitDimensions === null ? undefined : 'none' }}>
                <img draggable={false} className="source-preview" src={sourceUrl} alt={`Preview of ${project.getName().valueOf()}`} onLoad={(event) => previewLoaded(event.currentTarget)} />
                {!showOriginal && maskOverlayVisible && (activePanel === 'masks' || brushActive || colorPointActive || aiPointActive) && <MaskOverlay masks={projectMasks} selectedMaskId={selectedMaskId} />}
                {fitDimensions !== null && <div ref={guideFrame} className="fixed-guide-frame">
                  {toolWorkspace === 'develop' && activePanel === 'crop'
                    ? <CropSelectionOverlay crop={cropDraft ?? project.getViewportTransform().toPrimitives().cropFrame} guide={compositionGuide} />
                    : <CompositionFrameGuideOverlay guide={compositionGuide} frame="image" />}
                </div>}
              </div>
            )}
            <WorkspaceCompositionGuideOverlay guide={compositionGuide} />
            {activePanel === 'masks' && <div className={`active-mask-canvas-status${selectedMask === null ? ' empty' : ''}`} role="status" aria-live="polite">
              <span className="mask-status-swatch" aria-hidden="true" />
              {selectedMask === null ? <span><strong>No active mask</strong><small>Select or create a mask before painting or placing points.</small></span> : <span><strong>Editing {maskShapeLabel(selectedMask.shape.kind)} {selectedMaskIndex + 1}</strong><small>{selectedMask.enabled ? 'Enabled' : 'Disabled'} · {selectedMask.shape.kind === 'brush' ? `${brushMode === 'add' ? 'Paint' : 'Erase'} mode` : selectedMask.shape.kind === 'color-range' ? `${colorPointActive ? 'Add source sample' : 'Sample editing'} mode` : selectedMask.shape.kind === 'ai-segmentation' ? `${aiPointPolarity === 'positive' ? 'Include' : 'Exclude'} point mode` : 'Use the highlighted controls in the Masks panel'}</small></span>}
            </div>}
            {previewAnalysis?.sourcePrecision === 'embedded-preview-8-bit' && <div className="raw-fallback-notice" role="status">Embedded RAW preview fallback · open Photo information for the decoder reason</div>}
            {baselineError !== null && beforeSource === null && <div className="raw-fallback-notice" role="status">Before preview unavailable · {baselineError}</div>}
            {rawSource && preview === null && loadingSource !== null && <div className="comparison-badge">Camera JPEG preview · developing RAW</div>}
            {showOriginal && <div className="comparison-badge">{rawSource ? 'Neutral developed RAW' : 'Original'} · Before</div>}
          </div>
        </div>
        <aside className="tools-panel" aria-label="Editing tools">
          <div className="inspector-tabs" role="tablist" aria-label="Inspector">
            {inspectorTabs.map((tab) => <button role="tab" aria-selected={inspectorTab === tab.id} className={inspectorTab === tab.id ? `active ${tab.id}` : ''} type="button" key={tab.id} onClick={() => selectInspectorTab(tab.id)}><span aria-hidden="true">{tab.icon}</span><small>{tab.label}</small></button>)}
          </div>
          {inspectorTab === 'edit' && <div className="inspector-pane edit-inspector" role="tabpanel">
            <HistogramPanel analysis={previewAnalysis} />
            <div className="auto-enhance-row"><span><strong>Auto Enhance</strong><small>Correct material clipping with standard controls.</small></span><button className="button ghost" type="button" aria-label="Apply Auto Enhance" disabled={aiGenerating || previewAnalysis === null} onClick={applyClassicAutoEnhance}>Apply</button></div>
            <ToolSection id="light" title="Light" active={activePanel === 'light'} onToggle={setActivePanel}>
              <AdjustmentControls project={project} definitions={adjustmentDefinitions.filter((item) => item.section === 'light')} onChange={changeAdjustment} onToggle={toggleAdjustment} />
            </ToolSection>
            <ToolSection id="color" title="Color" active={activePanel === 'color'} onToggle={setActivePanel}>
              <AdjustmentControls project={project} definitions={adjustmentDefinitions.filter((item) => item.section === 'color')} onChange={changeAdjustment} onToggle={toggleAdjustment} />
            </ToolSection>
            <ToolSection id="detail" title="Detail" active={activePanel === 'detail'} onToggle={setActivePanel}>
              <AdjustmentControls project={project} definitions={adjustmentDefinitions.filter((item) => item.section === 'detail')} onChange={changeAdjustment} onToggle={toggleAdjustment} />
            </ToolSection>
            <ToolSection id="curves" title="Tone Curve" active={activePanel === 'curves'} onToggle={setActivePanel}>
              <p>Click the diagonal to add a point. Drag it or enter exact input and output values.</p>
              <ToneCurveEditor curves={project.getDevelopmentSettings().curves} analysis={previewAnalysis} onChange={changeCurve} />
              <div className="curve-presets">
                {(Object.keys(curvePresets) as Array<keyof typeof curvePresets>).map((name) => <button type="button" key={name} onClick={() => chooseCurvePreset(name)}>{name}</button>)}
              </div>
            </ToolSection>
          </div>}
          {inspectorTab === 'crop' && <div id="tool-crop" className="inspector-pane crop-inspector" role="tabpanel">
            <header className="inspector-heading"><div><h2>Crop &amp; Geometry</h2><p>Frame, straighten, rotate, and correct perspective.</p></div></header>
            <p className="crop-inspector-intro">Drag inside the frame to move it, use its corners to resize, or drag outside it to draw a new crop.</p>
            <GeometryControls project={project} onChange={changeViewport} guide={compositionGuide} onGuideChange={setCompositionGuide} horizonBusy={horizonBusy} horizonMessage={horizonMessage} onAutoStraighten={() => void autoStraighten()} />
          </div>}
          {inspectorTab === 'masks' && <div className="inspector-pane masks-inspector" role="tabpanel">
            <header className="inspector-heading"><h2>Masks</h2><p>Manual and semantic selections share the same editable mask stack.</p></header>
            <SemanticMaskControls
              descriptor={semanticDescriptor}
              status={semanticStatus}
              task={semanticTask}
              progress={semanticProgress}
              category={semanticCategory}
              message={semanticMessage}
              previewAvailable={preview !== null}
              onCategoryChange={setSemanticCategory}
              onInstall={() => void prepareSemanticModel()}
              onCancel={() => semanticAbort.current?.abort()}
              onRemove={() => void removeSemanticModel()}
              onGenerate={() => void generateSemanticMask()}
              onCreatePointMask={addAiMask}
            />
            <MaskControls
              project={project}
              analysis={previewAnalysis}
              selectedId={selectedMaskId}
              brushActive={brushActive}
              colorPointActive={colorPointActive}
              aiPointActive={aiPointActive}
              aiPointPolarity={aiPointPolarity}
              brushSize={brushSize}
              brushMode={brushMode}
              overlayVisible={maskOverlayVisible}
              onSelect={selectMask}
              onAddBrush={addBrushMask}
              onAddRadial={addRadialMask}
              onAddLinear={addLinearMask}
              onAddLuminance={addLuminanceMask}
              onAddColor={addColorMask}
              onUpdate={updateMask}
              onRemove={removeMask}
              onCompose={composeMasks}
              onDecompose={decomposeMask}
              onBrushActiveChange={(active) => { setBrushActive(active); if (active) { setColorPointActive(false); setAiPointActive(false); } }}
              onColorPointActiveChange={(active) => { setColorPointActive(active); if (active) { setBrushActive(false); setAiPointActive(false); } }}
              onAiPointActiveChange={(active) => { setAiPointActive(active); if (active) { setBrushActive(false); setColorPointActive(false); } }}
              onAiPointPolarityChange={setAiPointPolarity}
              onBrushSizeChange={setBrushSize}
              onBrushModeChange={setBrushMode}
              onOverlayVisibleChange={setMaskOverlayVisible}
            />
          </div>}
          {inspectorTab === 'ai' && <div className="inspector-pane ai-inspector" role="tabpanel">
            <header className="inspector-heading ai"><span aria-hidden="true">✦</span><div><h2>AI</h2><p>Build a reviewable recipe from the current image.</p></div><button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="AI settings">⋯</button></header>
            <label className="field-label" htmlFor="ai-edit-prompt">What should RAWcket create?</label>
            <div className="ai-prompt-shell">
              <textarea id="ai-edit-prompt" className="ai-prompt" rows={5} value={aiPrompt} disabled={aiGenerating} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Describe the result, ask for a crop, or request an open opinion." />
              <button className="ai-prompt-submit" type="button" aria-label="Ask AI for an opinion" title="Assess the current image and prepare a complete proposal" disabled={aiGenerating || preview === null} onClick={() => void generateAiProposal('', 'opinion')}>{aiGenerating ? <span className="mini-spinner" aria-hidden="true" /> : <span aria-hidden="true">✦</span>}</button>
            </div>
            <button className="button ai-primary full" type="button" disabled={aiGenerating || preview === null || aiPrompt.trim().length === 0} onClick={() => void generateAiProposal(aiPrompt, 'prompt')}>Create recipe</button>
            {aiGenerating && <div className="ai-working-state" role="status" aria-live="polite"><span className="mini-spinner" aria-hidden="true" /><span><strong>AI is building an editable recipe</strong><small>Reviewing crop, curves, geometry, light, and local masks. Empty, timed-out, and temporary failed responses are retried once automatically.</small></span></div>}
            {aiFailure !== null && <div className="ai-failure" role="alert"><strong>No editable recipe was returned</strong><span>{aiFailure}</span></div>}
            <p className="ai-status" aria-live="polite">{aiMessage}</p>
            {aiProposal !== null && (
              <div className="ai-proposal" aria-label="AI edit proposal">
                <div className="ai-opinion-summary"><strong>AI opinion</strong><p>{aiProposal.critique}</p><div><span>Strengths · {aiProposal.strengths.join(' · ')}</span><span>Opportunities · {aiProposal.opportunities.join(' · ')}</span></div></div>
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
                  <button className="button ghost" type="button" onClick={rejectAiProposal}>Reject</button>
                  <button className="button ai-primary" type="button" disabled={aiSelection.size === 0} onClick={applyAiProposal}>Apply selected</button>
                </div>
              </div>
            )}
            {aiDevelopmentHistory.length > 0 && <details className="ai-development-history">
              <summary>Saved AI sessions · {aiDevelopmentHistory.length}</summary>
              <div className="ai-development-history-list">
                {aiDevelopmentHistory.map((entry) => <article key={entry.id}>
                  <div><strong>{entry.suggestedIntent}</strong><span className={`ai-advice-status ${entry.status}`}>{entry.status}</span></div>
                  <small>{entry.request.length === 0 ? 'Open visual opinion' : `Asked · ${entry.request}`}</small>
                  <p>{entry.critique}</p>
                  <footer><span>{entry.operations.length} editable operation{entry.operations.length === 1 ? '' : 's'} · saved in project and bundle</span>{entry.status === 'proposed' && entry.id !== aiProposalId && <button className="text-button" type="button" onClick={() => {
                    setAiPrompt(entry.suggestedIntent);
                    setAiProposal(editProposalFromAdvice(entry));
                    setAiProposalId(entry.id);
                    setAiSelection(new Set(entry.operations.map((_, index) => index)));
                    setAiMessage('Restored the selected AI proposal from project history.');
                  }}>Resume</button>}</footer>
                </article>)}
              </div>
            </details>}
          </div>}
          {inspectorTab === 'history' && <div className="inspector-pane history-inspector" role="tabpanel">
            <div className="history-inspector-actions"><button type="button" disabled={!project.canUndo()} onClick={() => changeHistory('undo')}>Undo</button><button type="button" disabled={!project.canRedo()} onClick={() => changeHistory('redo')}>Redo</button><button type="button" onClick={() => setHistoryOpen(true)}>Timeline</button></div>
            <div className="history-inspector-empty"><strong>Visual history</strong><p>Use Timeline for the complete undo and redo sequence. The active recipe stays visible in the left panel.</p></div>
          </div>}
        </aside>
      </section>
      <footer className="editor-status-bar">
        <span>{Math.round(zoom * 100)}% · {showOriginal ? 'Before' : 'After'}</span>
        <span className={renderBusy || cropPreviewBusy || semanticTask !== null ? 'busy' : ''} role="status" aria-live="polite">{renderBusy ? `Updating preview · ${renderProgress}` : cropPreviewBusy ? 'Preparing crop workspace' : semanticTask === 'installing' ? `Downloading local model · ${Math.round(semanticProgress * 100)}%` : semanticTask === 'segmenting' ? `Creating mask · ${Math.round(semanticProgress * 100)}%` : 'Preview up to date'}</span>
        <span>{sourcePrecisionLabel} · {previewAnalysis?.backend === 'webgpu' ? 'WebGPU' : previewAnalysis?.backend === 'webgl2' ? 'WebGL2' : 'CPU'}</span>
      </footer>
      <AiSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} onConfigured={continuePendingAiAction} />
      <CloudStorageDialog open={cloudStorageOpen} onClose={() => setCloudStorageOpen(false)} onUploadProject={uploadProjectBundleToDrive} onUploadOriginal={uploadOriginalToDrive} />
      <PhotoInformationDialog project={project} analysis={previewAnalysis} open={photoInformationOpen} onClose={() => setPhotoInformationOpen(false)} />
      {historyOpen && <HistoryDialog project={project} onClose={() => setHistoryOpen(false)} onUndo={() => changeHistory('undo')} onRedo={() => changeHistory('redo')} />}
      <ExportPhotoDialog
        open={exportOpen}
        busy={exportBusy}
        progress={exportProgress}
        message={exportMessage}
        onClose={() => setExportOpen(false)}
        onExport={(settings) => void exportPhoto(settings)}
        onExportProject={() => void exportBundle()}
        onCancel={() => exportAbort.current?.abort()}
      />
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
    ['AI', 'A'],
    ['Before / after', 'B'],
    ['Cycle composition guides', 'G'],
    ['Open recipe', 'R'],
    ['Photo information', 'I'],
    ['Visual history', 'H'],
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

function pointerPressure(event: ReactPointerEvent<HTMLElement>): number {
  if (event.pointerType === 'mouse') return 1;
  return Math.min(1, Math.max(0.05, event.pressure > 0 ? event.pressure : 1));
}

function maskShapeLabel(kind: MaskDefinitionPrimitives['shape']['kind']): string {
  if (kind === 'brush') return 'Brush';
  if (kind === 'radial') return 'Radial';
  if (kind === 'linear-gradient') return 'Linear';
  if (kind === 'luminance-range') return 'Luminance';
  if (kind === 'color-range') return 'Color';
  if (kind === 'ai-segmentation') return 'Smart';
  return 'Composite';
}

function MaskOverlay({ masks, selectedMaskId }: { masks: MaskDefinitionPrimitives[]; selectedMaskId: string | null }): ReactElement {
  return (
    <svg className="mask-overlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Local mask overlay">
      {masks.filter((mask) => mask.enabled).map((mask) => {
        const className = `mask-shape${selectedMaskId === mask.id ? ' selected' : selectedMaskId === null ? '' : ' dimmed'}`;
        return <MaskShapeOverlay className={className} key={mask.id} mask={mask} />;
      })}
    </svg>
  );
}

function MaskShapeOverlay({ mask, className }: { mask: MaskDefinitionPrimitives; className: string }): ReactElement | null {
  if (!mask.enabled) return null;
  if (mask.shape.kind === 'brush') {
    return <g className={className}>{mask.shape.strokes.map((stroke, index) => <polyline className={stroke.mode === 'erase' ? 'mask-erase-stroke' : undefined} key={index} points={stroke.points.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" strokeWidth={stroke.size} strokeLinecap="round" strokeLinejoin="round" />)}</g>;
  }
  if (mask.shape.kind === 'radial') {
    return <g className={className}><ellipse cx={mask.shape.center.x} cy={mask.shape.center.y} rx={mask.shape.radiusX} ry={mask.shape.radiusY} fill="currentColor" transform={`rotate(${mask.shape.rotationDegrees} ${mask.shape.center.x} ${mask.shape.center.y})`} /></g>;
  }
  if (mask.shape.kind === 'linear-gradient') {
    return <g className={className}><defs><linearGradient id={`mask-gradient-${mask.id}`} x1={mask.shape.start.x} y1={mask.shape.start.y} x2={mask.shape.end.x} y2={mask.shape.end.y}><stop offset="0" stopOpacity="0" /><stop offset="1" stopOpacity="1" /></linearGradient></defs><rect width="1" height="1" fill={`url(#mask-gradient-${mask.id})`} /><line className="mask-gradient-axis" x1={mask.shape.start.x} y1={mask.shape.start.y} x2={mask.shape.end.x} y2={mask.shape.end.y} /></g>;
  }
  if (mask.shape.kind === 'color-range') {
    return <g className={`${className} color-mask-samples`}>{mask.shape.samples.map((point, index) => <g key={index} transform={`translate(${point.x} ${point.y})`}><circle r="0.016" /><path d="M-.024 0H.024 M0-.024V.024" /></g>)}</g>;
  }
  if (mask.shape.kind === 'ai-segmentation') {
    return <g className={`${className} smart-mask-points`}>
      {mask.shape.boundingBoxes.map((box, index) => <rect className="smart-mask-box" key={`box-${index}`} x={box.x} y={box.y} width={box.width} height={box.height} />)}
      {mask.shape.positivePoints.map((point, index) => <circle className="positive" key={`positive-${index}`} cx={point.x} cy={point.y} r="0.012" />)}
      {mask.shape.negativePoints.map((point, index) => <circle className="negative" key={`negative-${index}`} cx={point.x} cy={point.y} r="0.012" />)}
    </g>;
  }
  if (mask.shape.kind === 'composite') {
    return <g className={`${className} composite-mask-guides ${mask.shape.operation}`} data-composition-operation={mask.shape.operation}>
      {mask.shape.children.map((child, index) => <MaskShapeOverlay className={`mask-composite-child ${index === 0 ? 'primary' : 'secondary'}`} key={child.id} mask={child} />)}
    </g>;
  }
  return null;
}

function CompositionFrameGuideOverlay({ guide, frame }: { guide: CompositionGuide; frame: 'image' | 'crop' }): ReactElement | null {
  if (guide !== 'thirds' && guide !== 'golden-ratio') return null;
  return <svg className={`composition-guide-overlay ${frame}-guide`} viewBox="0 0 1 1" preserveAspectRatio="none" aria-label={`${frame === 'crop' ? 'Crop' : 'Image'} composition guide`}>
    {guide === 'thirds' && <path d="M.333 0V1 M.667 0V1 M0 .333H1 M0 .667H1" />}
    {guide === 'golden-ratio' && <path d="M.382 0V1 M.618 0V1 M0 .382H1 M0 .618H1" />}
  </svg>;
}

function WorkspaceCompositionGuideOverlay({ guide }: { guide: CompositionGuide }): ReactElement | null {
  if (guide !== 'grid' && guide !== 'diagonals') return null;
  const denseGridLines = Array.from({ length: 19 }, (_, index) => (index + 1) / 20);
  return <svg className="composition-guide-overlay workspace-guide" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Fixed composition grid">
    {guide === 'grid' && <>{denseGridLines.map((position, index) => <path className={(index + 1) % 5 === 0 ? 'grid-major' : 'grid-minor'} key={`grid-${position}`} d={`M${position} 0V1 M0 ${position}H1`} />)}</>}
    {guide === 'diagonals' && <path d="M0 0L1 1 M1 0L0 1" />}
  </svg>;
}

function CropSelectionOverlay({ crop, guide }: { crop: ViewportTransformPrimitives['cropFrame']; guide: CompositionGuide }): ReactElement {
  return <div className="crop-selection-overlay" role="img" aria-label={`Crop selection: left ${crop.x.toFixed(3)}, top ${crop.y.toFixed(3)}, width ${crop.width.toFixed(3)}, height ${crop.height.toFixed(3)}. Drag inside to move, drag a corner to resize, or drag outside to draw a new crop.`}>
    <span className="crop-selection-shade top" style={{ height: `${crop.y * 100}%` }} />
    <span className="crop-selection-shade bottom" style={{ top: `${(crop.y + crop.height) * 100}%` }} />
    <span className="crop-selection-shade left" style={{ top: `${crop.y * 100}%`, width: `${crop.x * 100}%`, height: `${crop.height * 100}%` }} />
    <span className="crop-selection-shade right" style={{ top: `${crop.y * 100}%`, left: `${(crop.x + crop.width) * 100}%`, height: `${crop.height * 100}%` }} />
    <div className="crop-selection-frame" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }}>
      <CompositionFrameGuideOverlay guide={guide} frame="crop" />
      <span className="top-left" data-crop-handle="top-left" /><span className="top-right" data-crop-handle="top-right" /><span className="bottom-left" data-crop-handle="bottom-left" /><span className="bottom-right" data-crop-handle="bottom-right" />
    </div>
  </div>;
}

function describeOperation(operation: EditOperation): string {
  if (operation.kind === EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT) {
    const label = adjustmentDefinitions.find((definition) => definition.key === operation.key)?.label ?? operation.key;
    return `${label}: ${operation.value > 0 ? '+' : ''}${operation.value}`;
  }
  if (operation.kind === EDIT_OPERATION.SET_GLOBAL_ADJUSTMENT_ENABLED) return `${operation.enabled ? 'Enable' : 'Disable'} ${operation.key}`;
  if (operation.kind === EDIT_OPERATION.SET_CURVE) return `Update ${operation.channel.toUpperCase()} curve`;
  if (operation.kind === EDIT_OPERATION.SET_VIEWPORT_TRANSFORM) return 'Update crop and geometry';
  if (operation.kind === EDIT_OPERATION.REPLACE_DEVELOPMENT_SETTINGS) return 'Replace development settings';
  if (operation.kind === EDIT_OPERATION.REPLACE_RECIPE) return 'Replace complete recipe';
  if (operation.kind === EDIT_OPERATION.RENAME_PROJECT) return `Rename project to ${operation.name}`;
  if (operation.kind === EDIT_OPERATION.SET_PROJECT_RATING) return `Rate project ${operation.rating} stars`;
  if (operation.kind === EDIT_OPERATION.SET_PROJECT_TAGS) return `Replace project tags`;
  if (operation.kind === EDIT_OPERATION.SET_PROJECT_FAVORITE) return operation.favorite ? 'Add project to favorites' : 'Remove project from favorites';
  if (operation.kind === EDIT_OPERATION.COMPOSE_MASKS) return `Combine ${operation.maskIds.length} masks · ${operation.operation}`;
  if (operation.kind === EDIT_OPERATION.DECOMPOSE_MASK) return 'Release composite child masks';
  if (operation.kind === EDIT_OPERATION.REMOVE_MASK) return 'Remove local mask';
  return operation.kind === EDIT_OPERATION.ADD_MASK ? 'Add local mask' : 'Update local mask';
}

function HistoryDialog({ project, onClose, onUndo, onRedo }: {
  project: PhotoProject;
  onClose: () => void;
  onUndo: () => void;
  onRedo: () => void;
}): ReactElement {
  const timeline = project.getHistoryTimeline();
  const applied = [...timeline.applied].reverse();
  const redo = [...timeline.availableRedo].reverse();
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="dialog history-dialog" role="dialog" aria-modal="true" aria-labelledby="history-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="dialog-heading"><div><span className="eyebrow">Non-destructive timeline</span><h2 id="history-title">Visual history</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close visual history">×</button></div>
      <div className="history-actions"><button type="button" disabled={!project.canUndo()} onClick={onUndo}>Undo latest</button><button type="button" disabled={!project.canRedo()} onClick={onRedo}>Redo</button></div>
      {applied.length === 0 && redo.length === 0 && <p className="muted">No edits have been recorded yet.</p>}
      {applied.length > 0 && <ol aria-label="Applied edits">{applied.map((operation, index) => <li className={index === 0 ? 'current' : ''} key={`${operation.kind}-${index}`}><span>{index === 0 ? 'Current' : `${applied.length - index}`}</span><strong>{describeOperation(operation)}</strong></li>)}</ol>}
      {redo.length > 0 && <><h3>Available redo</h3><ol className="redo-list" aria-label="Available redo edits">{redo.map((operation, index) => <li key={`${operation.kind}-${index}`}><span>Future</span><strong>{describeOperation(operation)}</strong></li>)}</ol></>}
    </section>
  </div>;
}
