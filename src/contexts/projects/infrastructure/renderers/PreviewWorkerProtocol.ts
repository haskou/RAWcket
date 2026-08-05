import { z } from 'zod';
import { photoProjectSchema } from '../serialization/ProjectSchemas';

const recipeSchema = photoProjectSchema.shape.recipe;

export const previewWorkerRequestSchema = z.object({
  id: z.uuid(),
  source: z.instanceof(Blob),
  sourceMimeType: z.enum(['image/jpeg', 'image/png', 'image/x-sony-arw']),
  maximumEdge: z.int().min(64).max(32_768).nullable(),
  output: z.object({
    mimeType: z.enum(['image/webp', 'image/jpeg', 'image/png']),
    quality: z.number().min(0.1).max(1)
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

export const previewWorkerResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('progress'),
    id: z.uuid(),
    stage: z.enum(['queued', 'decoding', 'developing', 'encoding']),
    completed: z.number().min(0).max(1)
  }),
  z.object({ kind: z.literal('completed'), id: z.uuid(), image: z.instanceof(Blob) }),
  z.object({ kind: z.literal('failed'), id: z.uuid(), message: z.string().min(1) })
]);

export type PreviewWorkerResponse = z.infer<typeof previewWorkerResponseSchema>;
