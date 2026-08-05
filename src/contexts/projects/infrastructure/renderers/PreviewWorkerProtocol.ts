import { z } from 'zod';
import { photoProjectSchema } from '../serialization/ProjectSchemas';

const recipeSchema = photoProjectSchema.shape.recipe;

export const previewWorkerRequestSchema = z.object({
  id: z.uuid(),
  source: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('bitmap'),
      image: z.instanceof(Blob),
      sourcePrecision: z.enum(['standard-8-bit', 'embedded-preview-8-bit']),
      rawFallbackReason: z.string().max(1_000).nullable()
    }),
    z.object({
      kind: z.literal('raw-linear-16-bit'),
      width: z.int().positive(),
      height: z.int().positive(),
      pixels: z.instanceof(Uint16Array)
    })
  ]),
  maximumEdge: z.int().min(64).max(32_768).nullable(),
  output: z.object({
    mimeType: z.enum(['image/webp', 'image/jpeg', 'image/png', 'image/tiff']),
    quality: z.number().min(0.1).max(1),
    sharpening: z.enum(['none', 'low', 'standard', 'high']),
    watermark: z.object({
      text: z.string().trim().min(1).max(120),
      opacity: z.number().min(0.1).max(1),
      sizePercent: z.number().min(1).max(10),
      position: z.enum(['bottom-left', 'bottom-center', 'bottom-right'])
    }).nullable()
  }),
  development: z.object({
    adjustments: recipeSchema.shape.globalAdjustments,
    curves: recipeSchema.shape.curves,
    disabledAdjustments: recipeSchema.shape.disabledGlobalAdjustments,
    masks: recipeSchema.shape.masks,
    viewport: recipeSchema.shape.viewport
  })
});

export type PreviewWorkerRequest = z.infer<typeof previewWorkerRequestSchema>;

const histogramSchema = z.object({
  red: z.array(z.number().min(0).max(1)).length(64),
  green: z.array(z.number().min(0).max(1)).length(64),
  blue: z.array(z.number().min(0).max(1)).length(64),
  luminance: z.array(z.number().min(0).max(1)).length(64),
  shadowClipping: z.number().min(0).max(1),
  highlightClipping: z.number().min(0).max(1),
  backend: z.enum(['webgpu', 'webgl2', 'cpu']),
  sourcePrecision: z.enum(['standard-8-bit', 'raw-linear-16-bit', 'embedded-preview-8-bit']),
  rawFallbackReason: z.string().max(1_000).nullable()
});

export const previewWorkerResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('progress'),
    id: z.uuid(),
    stage: z.enum(['queued', 'decoding', 'developing', 'analyzing', 'encoding']),
    completed: z.number().min(0).max(1)
  }),
  z.object({
    kind: z.literal('completed'),
    id: z.uuid(),
    image: z.instanceof(ArrayBuffer),
    mimeType: z.enum(['image/webp', 'image/jpeg', 'image/png', 'image/tiff']),
    analysis: histogramSchema
  }),
  z.object({ kind: z.literal('failed'), id: z.uuid(), message: z.string().min(1) })
]);

export type PreviewWorkerResponse = z.infer<typeof previewWorkerResponseSchema>;
