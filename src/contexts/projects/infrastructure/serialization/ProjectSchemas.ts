import { z } from 'zod';
import type { MaskDefinitionPrimitives } from '../../domain/MaskDefinition';

const pointSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });
const rectangleSchema = pointSchema.extend({ width: z.number().min(0).max(1), height: z.number().min(0).max(1) });
const adjustmentKeySchema = z.enum([
  'exposure', 'temperature', 'tint', 'contrast', 'highlights', 'shadows', 'whites', 'blacks',
  'saturation', 'vibrance', 'clarity', 'texture', 'dehaze', 'sharpness', 'noiseReduction', 'vignette'
]);
const adjustmentSchema = z.record(adjustmentKeySchema, z.number());
const localAdjustmentSchema = z.partialRecord(adjustmentKeySchema, z.number());
const toneCurveSchema = z.object({
  points: z.array(pointSchema).min(2).max(64),
  interpolation: z.enum(['linear', 'monotonic-cubic'])
});
const curveSetSchema = z.object({
  rgb: toneCurveSchema,
  red: toneCurveSchema,
  green: toneCurveSchema,
  blue: toneCurveSchema,
  luminance: toneCurveSchema.nullable()
});
const viewportSchema = z.object({
  cropFrame: rectangleSchema,
  translation: pointSchema,
  scale: z.number().min(0.1).max(32),
  rotationDegrees: z.number().min(-180).max(180),
  horizontalPerspective: z.number().min(-100).max(100).default(0),
  verticalPerspective: z.number().min(-100).max(100).default(0),
  flipHorizontal: z.boolean(),
  flipVertical: z.boolean(),
  aspectRatio: z.object({ width: z.number().positive(), height: z.number().positive() }).nullable()
});

export const developmentSettingsSchema = z.object({
  globalAdjustments: adjustmentSchema,
  curves: curveSetSchema,
  disabledGlobalAdjustments: z.array(adjustmentKeySchema)
});

export const maskSchema: z.ZodType<MaskDefinitionPrimitives> = z.lazy(() =>
  z.object({
    id: z.uuid(),
    enabled: z.boolean(),
    inverted: z.boolean(),
    opacity: z.number().min(0).max(1),
    feather: z.number().min(0).max(1),
    density: z.number().min(0).max(1),
    expansion: z.number().min(-0.25).max(0.25).default(0),
    localAdjustments: localAdjustmentSchema,
    shape: z.discriminatedUnion('kind', [
      z.object({
        kind: z.literal('brush'),
        strokes: z.array(z.object({
          points: z.array(pointSchema.extend({ pressure: z.number().min(0).max(1).default(1) })).min(1),
          size: z.number().positive(),
          hardness: z.number().min(0).max(1),
          flow: z.number().min(0).max(1),
          mode: z.enum(['add', 'erase']).default('add')
        }))
      }),
      z.object({ kind: z.literal('linear-gradient'), start: pointSchema, end: pointSchema }),
      z.object({
        kind: z.literal('radial'),
        center: pointSchema,
        radiusX: z.number().positive().max(1),
        radiusY: z.number().positive().max(1),
        rotationDegrees: z.number().min(-180).max(180)
      }),
      z.object({
        kind: z.literal('luminance-range'),
        minimum: z.number().min(0).max(1),
        maximum: z.number().min(0).max(1)
      }),
      z.object({
        kind: z.literal('color-range'),
        samples: z.array(pointSchema).min(1),
        tolerance: z.number().min(0).max(1)
      }),
      z.object({
        kind: z.literal('ai-segmentation'),
        prompt: z.string().min(1),
        positivePoints: z.array(pointSchema),
        negativePoints: z.array(pointSchema),
        boundingBoxes: z.array(rectangleSchema),
        strategy: z.string().min(1),
        version: z.string().min(1),
        semanticCategory: z.enum(['sky', 'water', 'vegetation', 'people', 'buildings']).nullable().optional(),
        confidence: z.number().min(0).max(1).nullable().optional(),
        rasterCacheKey: z.string().nullable()
      }),
      z.object({
        kind: z.literal('composite'),
        operation: z.enum(['add', 'subtract', 'intersect']),
        children: z.array(maskSchema).min(2)
      })
    ])
  })
);

export const editOperationSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('set-global-adjustment'),
    key: adjustmentKeySchema,
    value: z.number(),
    groupId: z.string().nullable()
  }),
  z.object({
    kind: z.literal('set-global-adjustment-enabled'),
    key: adjustmentKeySchema,
    enabled: z.boolean(),
    groupId: z.string().nullable()
  }),
  z.object({
    kind: z.literal('set-curve'),
    channel: z.enum(['rgb', 'red', 'green', 'blue', 'luminance']),
    curve: toneCurveSchema.nullable(),
    groupId: z.string().nullable()
  }),
  z.object({ kind: z.literal('add-mask'), mask: maskSchema, groupId: z.string().nullable() }),
  z.object({ kind: z.literal('update-mask'), mask: maskSchema, groupId: z.string().nullable() }),
  z.object({ kind: z.literal('remove-mask'), maskId: z.uuid(), groupId: z.string().nullable() }),
  z.object({ kind: z.literal('set-project-rating'), rating: z.int().min(0).max(5), groupId: z.string().nullable() }),
  z.object({ kind: z.literal('set-project-tags'), tags: z.array(z.string().min(1).max(32)).max(20), groupId: z.string().nullable() }),
  z.object({ kind: z.literal('set-project-favorite'), favorite: z.boolean(), groupId: z.string().nullable() }),
  z.object({
    kind: z.literal('replace-development-settings'),
    settings: developmentSettingsSchema,
    groupId: z.string().nullable()
  }),
  z.object({
    kind: z.literal('replace-recipe'),
    recipe: z.object({
      globalAdjustments: adjustmentSchema,
      curves: curveSetSchema,
      viewport: viewportSchema,
      masks: z.array(maskSchema),
      disabledGlobalAdjustments: z.array(adjustmentKeySchema)
    }),
    groupId: z.string().nullable()
  }),
  z.object({
    kind: z.literal('set-viewport-transform'),
    viewport: viewportSchema,
    groupId: z.string().nullable()
  }),
  z.object({ kind: z.literal('rename-project'), name: z.string().min(1).max(120), groupId: z.string().nullable() })
]);

const historyEntrySchema = z.object({ operation: editOperationSchema, inverse: editOperationSchema });

export const photoProjectSchema = z.object({
  schemaVersion: z.int().nonnegative(),
  id: z.uuid(),
  name: z.string().min(1).max(120),
  source: z.object({
    fileName: z.string().min(1),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/x-sony-arw']),
    size: z.int().positive(),
    storageKey: z.string().min(1)
  }),
  metadata: z.object({
    createdAt: z.number().finite(),
    updatedAt: z.number().finite(),
    width: z.int().positive(),
    height: z.int().positive()
  }),
  captureMetadata: z.object({
    cameraMake: z.string().min(1).max(160).nullable(),
    cameraModel: z.string().min(1).max(160).nullable(),
    lensModel: z.string().min(1).max(160).nullable(),
    capturedAt: z.string().min(1).max(160).nullable(),
    exposureTimeSeconds: z.number().positive().nullable(),
    apertureFNumber: z.number().positive().nullable(),
    iso: z.number().positive().nullable(),
    focalLengthMm: z.number().positive().nullable(),
    orientation: z.int().min(1).max(8).nullable(),
    whiteBalance: z.enum(['auto', 'manual']).nullable(),
    colorSpace: z.enum(['srgb', 'adobe-rgb', 'uncalibrated']).nullable(),
    blackLevel: z.number().nonnegative().nullable(),
    whiteLevel: z.number().nonnegative().nullable(),
    cfaPattern: z.string().min(1).max(160).nullable()
  }),
  organization: z.object({
    rating: z.int().min(0).max(5),
    tags: z.array(z.string().min(1).max(32)).max(20),
    favorite: z.boolean()
  }),
  recipe: z.object({
    globalAdjustments: adjustmentSchema,
    curves: curveSetSchema,
    viewport: viewportSchema,
    masks: z.array(maskSchema),
    disabledGlobalAdjustments: z.array(adjustmentKeySchema)
  }),
  history: z.object({
    limit: z.int().min(1).max(1000),
    undo: z.array(historyEntrySchema),
    redo: z.array(historyEntrySchema)
  }),
  uiState: z.object({ mode: z.enum(['simple', 'advanced']) })
});

export const projectManifestSchema = z.object({
  format: z.literal('rawcket-project'),
  formatVersion: z.literal(1),
  projectSchemaVersion: z.int().nonnegative(),
  files: z.record(z.string(), z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/), size: z.int().nonnegative() }))
});
