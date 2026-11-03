import { z } from 'zod';

/** Body of PUT /api/analyses/:id/feedback. `null` clears the visitor's earlier vote. */
export const feedbackBodySchema = z.object({
  helpful: z.boolean().nullable(),
});

export type FeedbackBody = z.infer<typeof feedbackBodySchema>;
