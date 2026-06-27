import { Router } from 'express';
import type { Request, Response } from 'express';

import { AppError } from '../middleware/errorHandler';
import {
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

// POST /api/analyses — analyze a log and save the result.
analysesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid request body');
  }
  const { rawLog, source, fileName } = parsed.data;

  const { report } = await analyzeLog(rawLog);

  const saved = await createAnalysis({
    source,
    fileName,
    rawLog,
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

// GET /api/analyses — history (lightweight summaries).
analysesRouter.get('/', async (_req: Request, res: Response) => {
  const analyses = await listAnalysisSummaries();
  res.json(analyses);
});

// GET /api/analyses/:id — a single analysis with its full report.
analysesRouter.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const analysis = await getAnalysisById(req.params.id);
  if (!analysis) {
    throw new AppError(404, `Analysis not found: ${req.params.id}`);
  }
  res.json(analysis);
});
