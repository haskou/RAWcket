import type { AdjustmentKeyPrimitive } from '@/contexts/projects/domain/value-objects/AdjustmentKey';

export type AdjustmentSection = 'light' | 'color' | 'detail';
export type AdjustmentDefinition = {
  key: AdjustmentKeyPrimitive;
  label: string;
  section: AdjustmentSection;
  minimum: number;
  maximum: number;
  step: number;
};

export const adjustmentDefinitions: readonly AdjustmentDefinition[] = [
  { key: 'exposure', label: 'Exposure', section: 'light', minimum: -5, maximum: 5, step: 0.05 },
  { key: 'contrast', label: 'Contrast', section: 'light', minimum: -100, maximum: 100, step: 1 },
  { key: 'highlights', label: 'Highlights', section: 'light', minimum: -100, maximum: 100, step: 1 },
  { key: 'shadows', label: 'Shadows', section: 'light', minimum: -100, maximum: 100, step: 1 },
  { key: 'whites', label: 'Whites', section: 'light', minimum: -100, maximum: 100, step: 1 },
  { key: 'blacks', label: 'Blacks', section: 'light', minimum: -100, maximum: 100, step: 1 },
  { key: 'temperature', label: 'Temperature', section: 'color', minimum: -100, maximum: 100, step: 1 },
  { key: 'tint', label: 'Tint', section: 'color', minimum: -100, maximum: 100, step: 1 },
  { key: 'saturation', label: 'Saturation', section: 'color', minimum: -100, maximum: 100, step: 1 },
  { key: 'vibrance', label: 'Vibrance', section: 'color', minimum: -100, maximum: 100, step: 1 },
  { key: 'clarity', label: 'Clarity', section: 'detail', minimum: -100, maximum: 100, step: 1 },
  { key: 'dehaze', label: 'Dehaze', section: 'detail', minimum: -100, maximum: 100, step: 1 },
  { key: 'sharpness', label: 'Sharpness', section: 'detail', minimum: 0, maximum: 100, step: 1 },
  { key: 'noiseReduction', label: 'Noise Reduction', section: 'detail', minimum: 0, maximum: 100, step: 1 }
];
