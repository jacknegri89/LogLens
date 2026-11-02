import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import type { Visitor } from '../middleware/visitor';
import {
  countAnalysesInLastHour,
  createAnalysis,
  getAnalysisById,
  listAnalysisSummaries,
} from '../repositories/analysisRepository';
import { createAnalysisBodySchema } from '../schemas/createAnalysis';
import { analyzeLog } from '../services/analysisService';

/**
 * Routes for log analyses. Express 5 forwards rejected promises from async
 * handlers to our errorHandler automatically, so we can just `throw` and never
 * wrap these in try/catch.
 */
export const analysesRouter = Router();

// Without a visitor id, a request would read or write the shared "no owner" rows.
analysesRouter.use((_req: Request, res: Response, next: NextFunction) => {
  if ((res.locals.visitor as Visitor).owner === '') {
    throw new AppError(400, 'Missing or invalid X-Visitor-Id header.');
  }
  next();
});

/** Refuses the request when this client, or everyone together, used up the hourly limit. */
async function enforceRateLimits(visitor: Visitor): Promise<void> {
  if (env.RATE_LIMIT_PER_HOUR > 0) {
    const used = await countAnalysesInLastHour(visitor.clientHash);
    if (used >= env.RATE_LIMIT_PER_HOUR) {
      throw new AppError(
        429,
        `Limit reached: ${env.RATE_LIMIT_PER_HOUR} analyses per hour. Try again later.`,
      );
    }
  }
  if (env.GLOBAL_LIMIT_PER_HOUR > 0) {
    const used = await countAnalysesInLastHour();
    if (used >= env.GLOBAL_LIMIT_PER_HOUR) {
      throw new AppError(429, 'The demo is busy right now. Try again in a while.');
    }
  }
}

// POST /api/analyses — analyze a log and save the result.
analysesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid request body');
  }
  const { rawLog, source, fileName } = parsed.data;
  const visitor = res.locals.visitor as Visitor;

  await enforceRateLimits(visitor);
  const { report } = await analyzeLog(rawLog);

  const saved = await createAnalysis({
    source,
    fileName,
    rawLog,
    owner: visitor.owner,
    clientHash: visitor.clientHash,
    title: report.title,
    severity: report.severity,
    category: report.category,
    report: {
      keyLines: report.keyLines,
      causes: report.causes,
      debugSteps: report.debugSteps,
      bugReportMarkdown: report.bugReportMarkdown,
    },
  });

  res.status(201).json(saved);
});

// GET /api/analyses — the visitor's own history (lightweight summaries).
analysesRouter.get('/', async (_req: Request, res: Response) => {
  const analyses = await listAnalysisSummaries((res.locals.visitor as Visitor).owner);
  res.json(analyses);
});

// GET /api/analyses/:id — a single analysis with its full report.
analysesRouter.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const analysis = await getAnalysisById(req.params.id, (res.locals.visitor as Visitor).owner);
  if (!analysis) {
    throw new AppError(404, `Analysis not found: ${req.params.id}`);
  }
  res.json(analysis);
});
