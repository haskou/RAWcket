import { z } from 'zod';
import type { ImportCandidateAssessment, ImportCandidateForReview, ImportCandidateReviewer } from '../../application/ports/ImportCandidateReviewer';
import type { OpenAiResponsesClient } from '@/contexts/ai/infrastructure/openai/OpenAiResponsesClient';
import { parseAiStructuredResult } from '@/contexts/ai/infrastructure/validation/parseAiStructuredResult';

const assessmentSchema = z.object({
  candidateId: z.string().min(1).max(100), score: z.int().min(0).max(100), rank: z.int().positive(),
  reasons: z.array(z.string().min(1).max(300)).min(3).max(5),
  focusPotential: z.string().min(1).max(300), reframingPotential: z.string().min(1).max(300),
  editingPotential: z.string().min(1).max(300), visualInterest: z.string().min(1).max(300), story: z.string().min(1).max(300)
});
const resultSchema = z.object({ assessments: z.array(assessmentSchema).min(2).max(20) });
const resultJsonSchema = {
  type: 'object', additionalProperties: false, required: ['assessments'],
  properties: {
    assessments: {
      type: 'array', minItems: 2, maxItems: 20,
      items: {
        type: 'object', additionalProperties: false,
        required: ['candidateId', 'score', 'rank', 'reasons', 'focusPotential', 'reframingPotential', 'editingPotential', 'visualInterest', 'story'],
        properties: {
          candidateId: { type: 'string', minLength: 1, maxLength: 100 }, score: { type: 'integer', minimum: 0, maximum: 100 }, rank: { type: 'integer', minimum: 1 },
          reasons: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string', minLength: 1, maxLength: 300 } },
          focusPotential: { type: 'string', minLength: 1, maxLength: 300 }, reframingPotential: { type: 'string', minLength: 1, maxLength: 300 }, editingPotential: { type: 'string', minLength: 1, maxLength: 300 },
          visualInterest: { type: 'string', minLength: 1, maxLength: 300 }, story: { type: 'string', minLength: 1, maxLength: 300 }
        }
      }
    }
  }
};

export class OpenAiImportCandidateReviewer implements ImportCandidateReviewer {
  public constructor(private readonly client: OpenAiResponsesClient) {}

  public async review(candidates: ImportCandidateForReview[]): Promise<ImportCandidateAssessment[]> {
    const candidateFacts = candidates.map(({ candidateId, fileName, width, height }) => ({ candidateId, fileName, width, height }));
    const result = parseAiStructuredResult(resultSchema, await this.client.reason({
      schemaName: 'rawcket_import_comparison', schema: resultJsonSchema,
      images: candidates.map(({ candidateId, preview }) => ({ label: candidateId, preview })),
      instructions: [
        'Compare every photograph as an experienced photo editor choosing the source with the strongest final result after editing.',
        `Candidates: ${JSON.stringify(candidateFacts)}.`,
        'Rank the set relative to one another. Prioritize usable focus, subject and moment, better framing or crop possibilities, recoverable light and color, visual interest, and which image tells the strongest story.',
        'Predict post-edit potential rather than rewarding the current brightness, contrast, file size, or pixel count. A technically imperfect but compelling and recoverable frame may outrank a clean but empty one.',
        'Use each exact candidateId once, assign unique ranks beginning at 1, and give concrete visible reasons. Never invent people, objects, or capture facts that are not visible.'
      ].join('\n')
    }), 'a photograph comparison');
    const expectedIds = new Set(candidates.map((candidate) => candidate.candidateId));
    const actualIds = new Set(result.assessments.map((assessment) => assessment.candidateId));
    const ranks = new Set(result.assessments.map((assessment) => assessment.rank));
    if (actualIds.size !== candidates.length || [...expectedIds].some((id) => !actualIds.has(id)) || ranks.size !== candidates.length || [...ranks].some((rank) => rank > candidates.length)) {
      throw new Error('OpenAI returned an incomplete photograph comparison.');
    }
    return result.assessments.map(({ focusPotential, reframingPotential, editingPotential, visualInterest, story, ...assessment }) => ({
      ...assessment,
      evaluation: { focusPotential, reframingPotential, editingPotential, visualInterest, story }
    }));
  }
}
