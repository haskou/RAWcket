import { z } from 'zod';

export const adjustmentKeys = ['exposure', 'temperature', 'tint', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'saturation', 'vibrance', 'clarity', 'texture', 'dehaze', 'sharpness', 'noiseReduction', 'vignette'] as const;
const channels = ['rgb', 'red', 'green', 'blue', 'luminance'] as const;
const pointSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });
const adjustmentSchema = z.object({ key: z.enum(adjustmentKeys), value: z.number().min(-100).max(100) });
const cropSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().gt(0).max(1),
  height: z.number().gt(0).max(1)
});

const operationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('global-adjustment'), key: z.enum(adjustmentKeys), value: z.number().min(-100).max(100) }),
  z.object({
    kind: z.literal('tone-curve'),
    channel: z.enum(channels),
    points: z.array(pointSchema).min(2).max(12),
    interpolation: z.literal('monotonic-cubic')
  }),
  z.object({
    kind: z.literal('viewport'),
    cropFrame: cropSchema,
    translation: pointSchema,
    scale: z.number().min(0.1).max(32),
    rotationDegrees: z.number().min(-180).max(180),
    horizontalPerspective: z.number().min(-100).max(100),
    verticalPerspective: z.number().min(-100).max(100),
    flipHorizontal: z.boolean(),
    flipVertical: z.boolean(),
    aspectRatio: z.object({ width: z.number().positive(), height: z.number().positive() }).nullable()
  }),
  z.object({
    kind: z.literal('radial-mask'),
    center: pointSchema,
    radiusX: z.number().gt(0).max(1),
    radiusY: z.number().gt(0).max(1),
    rotationDegrees: z.number().min(-180).max(180),
    inverted: z.boolean(),
    opacity: z.number().min(0).max(1),
    feather: z.number().min(0).max(1),
    density: z.number().min(0).max(1),
    localAdjustments: z.array(adjustmentSchema).min(1).max(8)
  }),
  z.object({
    kind: z.literal('linear-gradient-mask'),
    start: pointSchema,
    end: pointSchema,
    inverted: z.boolean(),
    opacity: z.number().min(0).max(1),
    feather: z.number().min(0).max(1),
    density: z.number().min(0).max(1),
    localAdjustments: z.array(adjustmentSchema).min(1).max(8)
  }),
  z.object({
    kind: z.literal('luminance-range-mask'),
    minimum: z.number().min(0).max(1),
    maximum: z.number().min(0).max(1),
    inverted: z.boolean(),
    opacity: z.number().min(0).max(1),
    feather: z.number().min(0).max(1),
    density: z.number().min(0).max(1),
    localAdjustments: z.array(adjustmentSchema).min(1).max(8)
  })
]);

export const openAiEditProposalSchema = z.object({
  explanation: z.string().min(1).max(1200),
  operations: z.array(operationSchema).min(1).max(16)
});

export type OpenAiEditProposal = z.infer<typeof openAiEditProposalSchema>;

const number = (minimum: number, maximum: number, exclusiveMinimum = false): Record<string, unknown> => ({
  type: 'number',
  [exclusiveMinimum ? 'exclusiveMinimum' : 'minimum']: minimum,
  maximum
});
const pointJsonSchema = {
  type: 'object', additionalProperties: false, required: ['x', 'y'],
  properties: { x: number(0, 1), y: number(0, 1) }
};
const localAdjustmentsJsonSchema = {
  type: 'array', minItems: 1, maxItems: 8,
  items: {
    type: 'object', additionalProperties: false, required: ['key', 'value'],
    properties: { key: { type: 'string', enum: [...adjustmentKeys] }, value: number(-100, 100) }
  }
};
const maskProperties = {
  inverted: { type: 'boolean' },
  opacity: number(0, 1),
  feather: number(0, 1),
  density: number(0, 1),
  localAdjustments: localAdjustmentsJsonSchema
};
const maskRequired = ['kind', 'inverted', 'opacity', 'feather', 'density', 'localAdjustments'];

export const openAiEditProposalJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['explanation', 'operations'],
  properties: {
    explanation: { type: 'string', minLength: 1, maxLength: 1200 },
    operations: {
      type: 'array', minItems: 1, maxItems: 16,
      items: {
        anyOf: [
          {
            type: 'object', additionalProperties: false, required: ['kind', 'key', 'value'],
            properties: { kind: { type: 'string', enum: ['global-adjustment'] }, key: { type: 'string', enum: [...adjustmentKeys] }, value: number(-100, 100) }
          },
          {
            type: 'object', additionalProperties: false, required: ['kind', 'channel', 'points', 'interpolation'],
            properties: {
              kind: { type: 'string', enum: ['tone-curve'] }, channel: { type: 'string', enum: [...channels] },
              points: { type: 'array', minItems: 2, maxItems: 12, items: pointJsonSchema },
              interpolation: { type: 'string', enum: ['monotonic-cubic'] }
            }
          },
          {
            type: 'object', additionalProperties: false,
            required: ['kind', 'cropFrame', 'translation', 'scale', 'rotationDegrees', 'horizontalPerspective', 'verticalPerspective', 'flipHorizontal', 'flipVertical', 'aspectRatio'],
            properties: {
              kind: { type: 'string', enum: ['viewport'] },
              cropFrame: {
                type: 'object', additionalProperties: false, required: ['x', 'y', 'width', 'height'],
                properties: { x: number(0, 1), y: number(0, 1), width: number(0, 1, true), height: number(0, 1, true) }
              },
              translation: pointJsonSchema,
              scale: number(0.1, 32), rotationDegrees: number(-180, 180),
              horizontalPerspective: number(-100, 100), verticalPerspective: number(-100, 100),
              flipHorizontal: { type: 'boolean' }, flipVertical: { type: 'boolean' },
              aspectRatio: {
                anyOf: [
                  { type: 'null' },
                  { type: 'object', additionalProperties: false, required: ['width', 'height'], properties: { width: { type: 'number', exclusiveMinimum: 0 }, height: { type: 'number', exclusiveMinimum: 0 } } }
                ]
              }
            }
          },
          {
            type: 'object', additionalProperties: false,
            required: [...maskRequired, 'center', 'radiusX', 'radiusY', 'rotationDegrees'],
            properties: { kind: { type: 'string', enum: ['radial-mask'] }, ...maskProperties, center: pointJsonSchema, radiusX: number(0, 1, true), radiusY: number(0, 1, true), rotationDegrees: number(-180, 180) }
          },
          {
            type: 'object', additionalProperties: false,
            required: [...maskRequired, 'start', 'end'],
            properties: { kind: { type: 'string', enum: ['linear-gradient-mask'] }, ...maskProperties, start: pointJsonSchema, end: pointJsonSchema }
          },
          {
            type: 'object', additionalProperties: false,
            required: [...maskRequired, 'minimum', 'maximum'],
            properties: { kind: { type: 'string', enum: ['luminance-range-mask'] }, ...maskProperties, minimum: number(0, 1), maximum: number(0, 1) }
          }
        ]
      }
    }
  }
};
