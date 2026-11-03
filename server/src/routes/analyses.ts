import { Router } from 'express';
import type { Request, Response } from 'express';

import type { AIReport } from '../ai/schema';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { requireVisitorOwner, type Visitor } from '../middleware/visitor';
import {
  countAttemptsInLastHour,
  createAnalysis,
  createShareToken,
  deleteAnalysesByOwner,
  getAnalysisById,
  listAnalysisSummaries,
  recordAttempt,
  removeAttempt,
  revokeShareToken,
  setFeedback,
} from '../repositories/analysisRepository';
import { createAnalysisBodySchema, type CreateAnalysisBody } from '../schemas/createAnalysis';
import { feedbackBodySchema } from '../schemas/feedback';
import { analyzeLog } from '../services/analysisService';
import { parseLanguage, type Language } from '../types/language';

/**
 * Routes for log analyses. Express 5 forwards rejected promises from async
 * handlers to our errorHandler automatically, so we can just `throw` and never
 * wrap these in try/catch.
 */
export const analysesRouter = Router();

analysesRouter.use(requireVisitorOwner);

/**
 * Saves this attempt before the AI is called, so a failed call still uses up the limit.
 * The count includes the attempt itself, so a refused attempt is removed again. Two
 * requests that arrive together can both be refused, but never both be allowed past the limit.
 */
async function reserveAttempt(visitor: Visitor): Promise<void> {
  const attemptId = await recordAttempt(visitor.clientHash);
  const refusal = await findRefusal(visitor.clientHash);
  if (refusal) {
    await removeAttempt(attemptId);
    throw new AppError(429, refusal);
  }
}

/** The message for a limit that this attempt would go over, or null when it may go on. */
async function findRefusal(clientHash: string): Promise<string | null> {
  const [clientUsed, globalUsed] = await Promise.all([
    env.RATE_LIMIT_PER_HOUR > 0 ? countAttemptsInLastHour(clientHash) : 0,
    env.GLOBAL_LIMIT_PER_HOUR > 0 ? countAttemptsInLastHour() : 0,
  ]);
  if (clientUsed > env.RATE_LIMIT_PER_HOUR) {
    return `Limit reached: ${env.RATE_LIMIT_PER_HOUR} analyses per hour. Try again later.`;
  }
  if (globalUsed > env.GLOBAL_LIMIT_PER_HOUR) {
    return 'The demo is busy right now. Try again in a while.';
  }
  return null;
}

// POST /api/analyses — analyze a log and save the result.
analysesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid request body');
  }
  const visitor = res.locals.visitor as Visitor;
  const language = parseLanguage(req.get('X-Language'));

  await reserveAttempt(visitor);
  const saved = await analyzeAndSave(parsed.data, visitor, language);

  res.status(201).json(saved);
});

/** Runs the analysis on the submitted log, with the report in the visitor's language, and stores it. */
async function analyzeAndSave(input: CreateAnalysisBody, visitor: Visitor, language: Language) {
  const { report } = await analyzeLog(input.rawLog, language);

  return createAnalysis({
    source: input.source,
    fileName: input.fileName,
    rawLog: input.rawLog,
    owner: visitor.owner,
    clientHash: visitor.clientHash,
    title: report.title,
    severity: report.severity,
    category: report.category,
    report: pickStoredReport(report),
  });
}

/** The parts of a report that are saved with the analysis. */
function pickStoredReport(report: AIReport) {
  return {
    keyLines: report.keyLines,
    causes: report.causes,
    debugSteps: report.debugSteps,
    bugReportMarkdown: report.bugReportMarkdown,
    format: report.format,
    findings: report.findings,
    overview: report.overview,
    timeline: report.timeline,
  };
}

// GET /api/analyses — the visitor's own history (lightweight summaries).
analysesRouter.get('/', async (_req: Request, res: Response) => {
  const analyses = await listAnalysisSummaries((res.locals.visitor as Visitor).owner);
  res.json(analyses);
});

// DELETE /api/analyses — erases the whole history of this visitor only.
analysesRouter.delete('/', async (_req: Request, res: Response) => {
  const deleted = await deleteAnalysesByOwner((res.locals.visitor as Visitor).owner);
  res.json({ deleted });
});

// PUT /api/analyses/:id/feedback — the visitor's verdict: useful, not useful, or cleared (null).
analysesRouter.put('/:id/feedback', async (req: Request<{ id: string }>, res: Response) => {
  const parsed = feedbackBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, 'Send { "helpful": true | false | null }.');
  }
  const owner = (res.locals.visitor as Visitor).owner;
  const saved = await setFeedback(req.params.id, owner, parsed.data.helpful);
  if (!saved) {
    throw new AppError(404, `Analysis not found: ${req.params.id}`);
  }
  res.json({ helpful: parsed.data.helpful });
});

// POST /api/analyses/:id/share — creates the secret read-only link (or returns the existing one).
analysesRouter.post('/:id/share', async (req: Request<{ id: string }>, res: Response) => {
  const shareToken = await createShareToken(req.params.id, (res.locals.visitor as Visitor).owner);
  if (!shareToken) {
    throw new AppError(404, `Analysis not found: ${req.params.id}`);
  }
  res.status(201).json({ shareToken });
});

// DELETE /api/analyses/:id/share — revokes the link; the old URL stops working.
analysesRouter.delete('/:id/share', async (req: Request<{ id: string }>, res: Response) => {
  const revoked = await revokeShareToken(req.params.id, (res.locals.visitor as Visitor).owner);
  if (!revoked) {
    throw new AppError(404, `Analysis not found: ${req.params.id}`);
  }
  res.json({ revoked: true });
});

// GET /api/analyses/:id — a single analysis with its full report.
analysesRouter.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const analysis = await getAnalysisById(req.params.id, (res.locals.visitor as Visitor).owner);
  if (!analysis) {
    throw new AppError(404, `Analysis not found: ${req.params.id}`);
  }
  res.json(analysis);
});
