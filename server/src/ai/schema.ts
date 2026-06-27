import { z } from 'zod';

/**
 * The exact shape we require back from the AI. We validate every AI response
 * against this with Zod, so the rest of the app can trust the data instead of
 * hoping the model behaved. See docs/prompts.md for the prompt that asks for it.
 */
export const aiReportSchema = z.object({
  title: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']),
  category: z.string().min(1),
  keyLines: z.array(z.string()).default([]),
  causes: z.array(z.string()).default([]),
  debugSteps: z.array(z.string()).default([]),
  bugReportMarkdown: z.string().min(1),
});

export type AIReport = z.infer<typeof aiReportSchema>;
