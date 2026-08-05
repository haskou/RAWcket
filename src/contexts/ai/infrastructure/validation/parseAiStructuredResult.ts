import type { z } from 'zod';

export function parseAiStructuredResult<Result>(schema: z.ZodType<Result>, value: unknown, resultName: string): Result {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`OpenAI returned ${resultName} outside RAWcket’s validated limits. Please try again or choose another compatible model.`);
  }
  return parsed.data;
}
