import { z } from 'zod';

const severitySchema = z.enum(['informational', 'low', 'medium', 'high', 'critical']);

export const findingSchema = z.object({
  title: z.string().min(1).max(300),
  severity: severitySchema,
  category: z.string().min(1).max(100),
  evidence: z.string().min(1).max(2000),
  technique: z.string().min(1).max(100).optional(),
  owasp: z.string().min(1).max(100).optional(),
});

/**
 * The exact shape we require back from the AI. We validate every AI response
 * against this with Zod, so the rest of the app can trust the data instead of
 * hoping the model behaved. See docs/prompts.md for the prompt that asks for it.
 */
export const aiReportSchema = z.object({
  title: z.string().min(1).max(300),
  severity: severitySchema,
  category: z.string().min(1).max(100),
  keyLines: z.array(z.string().max(2000)).max(50).default([]),
  causes: z.array(z.string().max(1500)).max(20).default([]),
  debugSteps: z.array(z.string().max(1500)).max(20).default([]),
  bugReportMarkdown: z.string().min(1).max(12000),
  format: z.string().min(1).max(100).optional(),
  findings: z.array(findingSchema).max(5).optional(),
});

export type AIReport = z.infer<typeof aiReportSchema>;
