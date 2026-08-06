import type { AdjustmentKeyPrimitive } from '@/contexts/projects/domain/value-objects/AdjustmentKey';

export type AdjustmentSection = 'light' | 'color' | 'detail';
export type AdjustmentDefinition = {
  key: AdjustmentKeyPrimitive;
  label: string;
  section: AdjustmentSection;
  minimum: number;
  maximum: number;
  step: number;
  unit: 'EV' | '%';
};

export const adjustmentDefinitions: readonly AdjustmentDefinition[] = [
  { key: 'exposure', label: 'Exposure', section: 'light', minimum: -5, maximum: 5, step: 0.05, unit: 'EV' },
  { key: 'contrast', label: 'Contrast', section: 'light', minimum: -100, maximum: 100, step: 1, unit: '%' },
  { key: 'highlights', label: 'Highlights', section: 'light', minimum: -100, maximum: 100, step: 1, unit: '%' },
  { key: 'shadows', label: 'Shadows', section: 'light', minimum: -100, maximum: 100, step: 1, unit: '%' },
  { key: 'whites', label: 'Whites', section: 'light', minimum: -100, maximum: 100, step: 1, unit: '%' },
  { key: 'blacks', label: 'Blacks', section: 'light', minimum: -100, maximum: 100, step: 1, unit: '%' },
  { key: 'temperature', label: 'Temperature', section: 'color', minimum: -100, maximum: 100, step: 1, unit: '%' },
  { key: 'tint', label: 'Tint', section: 'color', minimum: -100, maximum: 100, step: 1, unit: '%' },
  { key: 'saturation', label: 'Saturation', section: 'color', minimum: -100, maximum: 100, step: 1, unit: '%' },
  { key: 'vibrance', label: 'Vibrance', section: 'color', minimum: -100, maximum: 100, step: 1, unit: '%' },
  { key: 'clarity', label: 'Clarity', section: 'detail', minimum: -100, maximum: 100, step: 1, unit: '%' },
  { key: 'texture', label: 'Texture', section: 'detail', minimum: -100, maximum: 100, step: 1, unit: '%' },
  { key: 'dehaze', label: 'Dehaze', section: 'detail', minimum: -100, maximum: 100, step: 1, unit: '%' },
  { key: 'sharpness', label: 'Sharpness', section: 'detail', minimum: 0, maximum: 100, step: 1, unit: '%' },
  { key: 'noiseReduction', label: 'Noise Reduction', section: 'detail', minimum: 0, maximum: 100, step: 1, unit: '%' },
  { key: 'vignette', label: 'Vignette', section: 'detail', minimum: -100, maximum: 100, step: 1, unit: '%' }
];
