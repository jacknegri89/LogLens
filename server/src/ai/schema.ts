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

export const timelineEntrySchema = z.object({
  time: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(300),
  category: z.string().min(1).max(100),
  severity: severitySchema,
  role: z.enum(['root', 'effect', 'independent']),
  evidence: z.string().min(1).max(300),
  causedBy: z.number().int().min(0).max(7).optional(),
});

const rootCauseStatusSchema = z.enum(['confirmed', 'probable', 'unverified', 'insufficient']);

/**
 * What the model says about one incident that the server found. The model never creates incidents:
 * it judges the ones in its input, by id, and every claim it makes is checked against the log.
 */
export const incidentAssessmentSchema = z.object({
  incidentId: z.string().min(1).max(20),
  rootCauseStatus: rootCauseStatusSchema,
  rootCauseSummary: z.string().min(1).max(600),
  reasoning: z.string().max(2000).optional(),
  /** The ids of the events the model relies on. An id that is not in the input is dropped. */
  evidenceEventIds: z.array(z.string().max(20)).max(30).default([]),
  contradictingNotes: z.array(z.string().max(400)).max(5).default([]),
  immediateActions: z.array(z.string().max(600)).max(10).default([]),
  permanentFix: z.array(z.string().max(600)).max(10).default([]),
  preventiveMeasures: z.array(z.string().max(600)).max(10).default([]),
});

export type IncidentAssessment = z.infer<typeof incidentAssessmentSchema>;

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
  overview: z.array(z.string().min(1).max(400)).max(6).optional(),
  timeline: z.array(timelineEntrySchema).max(8).optional(),
  /** Only when the prompt carried structured incidents; consumed by the server, never stored as is. */
  incidentAssessments: z.array(incidentAssessmentSchema).max(100).optional(),
});

export type AIReport = z.infer<typeof aiReportSchema>;
