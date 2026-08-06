import type { MaskDefinitionPrimitives } from '@/contexts/projects/domain/MaskDefinition';

export type MaskRowProjection = {
  title: string;
  provenance: string | null;
  status: string;
};

export function projectMaskRow(mask: MaskDefinitionPrimitives, index: number): MaskRowProjection {
  return {
    title: `${maskKindLabel(mask.shape.kind)} ${index + 1}`,
    provenance: semanticProvenance(mask),
    status: mask.enabled ? `On · ${maskVisualizationStatus(mask.shape.kind)}` : 'Off'
  };
}

export function maskKindLabel(kind: MaskDefinitionPrimitives['shape']['kind']): string {
  if (kind === 'brush') return 'Brush';
  if (kind === 'radial') return 'Radial';
  if (kind === 'linear-gradient') return 'Linear gradient';
  if (kind === 'luminance-range') return 'Luminance range';
  if (kind === 'ai-segmentation') return 'Smart';
  if (kind === 'color-range') return 'Color range';
  return 'Composite';
}

function semanticProvenance(mask: MaskDefinitionPrimitives): string | null {
  if (mask.shape.kind !== 'ai-segmentation' || mask.shape.semanticCategory === undefined || mask.shape.semanticCategory === null) {
    return null;
  }
  const category = `${mask.shape.semanticCategory[0]?.toUpperCase() ?? ''}${mask.shape.semanticCategory.slice(1)}`;
  if (mask.shape.confidence === undefined || mask.shape.confidence === null) return `${category} · Confidence unavailable`;
  return `${category} · ${Math.round(mask.shape.confidence * 100)}% confidence`;
}

function maskVisualizationStatus(kind: MaskDefinitionPrimitives['shape']['kind']): string {
  if (kind === 'luminance-range') return 'effect only';
  if (kind === 'color-range') return 'source samples';
  if (kind === 'ai-segmentation') return 'points + box';
  if (kind === 'composite') return 'combined';
  return 'overlay';
}
