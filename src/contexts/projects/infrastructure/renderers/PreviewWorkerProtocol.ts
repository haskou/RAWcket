import { z } from 'zod';
import { photoProjectSchema } from '../serialization/ProjectSchemas';

const recipeSchema = photoProjectSchema.shape.recipe;

export const previewWorkerRequestSchema = z.object({
  id: z.uuid(),
  source: z.instanceof(Blob),
  maximumEdge: z.int().min(64).max(4096),
  development: z.object({
    adjustments: recipeSchema.shape.globalAdjustments,
    curves: recipeSchema.shape.curves,
    disabledAdjustments: recipeSchema.shape.disabledGlobalAdjustments
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
  z.object({ kind: z.literal('completed'), id: z.uuid(), preview: z.instanceof(Blob) }),
  z.object({ kind: z.literal('failed'), id: z.uuid(), message: z.string().min(1) })
]);

export type PreviewWorkerResponse = z.infer<typeof previewWorkerResponseSchema>;
