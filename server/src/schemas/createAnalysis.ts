import { z } from 'zod';

/**
 * Validation for the POST /api/analyses request body. Never trust client input:
 * we check it here, and the route rejects anything that doesn't fit with a 400.
 */
export const createAnalysisBodySchema = z.object({
  rawLog: z
    .string()
    .min(1, 'rawLog is required')
    .max(200_000, 'log is too large (max 200,000 characters)'),
  source: z.enum(['paste', 'upload']).optional(),
  fileName: z.string().max(255).optional(),
});

export type CreateAnalysisBody = z.infer<typeof createAnalysisBodySchema>;
