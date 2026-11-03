import { Router } from 'express';
import type { Request, Response } from 'express';

import { AppError } from '../middleware/errorHandler';
import { requireVisitorOwner, type Visitor } from '../middleware/visitor';
import {
  createShareToken,
  deleteAnalysesByOwner,
  deleteAnalysisById,
  getAnalysisById,
  listAnalysisSummaries,
  revokeShareToken,
  setFeedback,
} from '../repositories/analysisRepository';
import { createAnalysisBodySchema } from '../schemas/createAnalysis';
import { feedbackBodySchema } from '../schemas/feedback';
import { reserveAttempt } from '../services/attemptLimit';
import { analyzeAndSave } from '../services/saveAnalysis';
import { parseLanguage } from '../types/language';

/**
 * Routes for log analyses. Express 5 forwards rejected promises from async
 * handlers to our errorHandler automatically, so we can just `throw` and never
 * wrap these in try/catch.
 */
export const analysesRouter = Router();

analysesRouter.use(requireVisitorOwner);

// POST /api/analyses — analyze a log and save the result.
analysesRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid request body');
  }
  const visitor = res.locals.visitor as Visitor;
  const language = parseLanguage(req.get('X-Language'));

  await reserveAttempt(visitor.clientHash);
  const saved = await analyzeAndSave(parsed.data, visitor, language);

  res.status(201).json(saved);
});

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

// DELETE /api/analyses/:id — erases one analysis of this visitor.
analysesRouter.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const removed = await deleteAnalysisById(req.params.id, (res.locals.visitor as Visitor).owner);
  if (!removed) {
    throw new AppError(404, `Analysis not found: ${req.params.id}`);
  }
  res.json({ deleted: 1 });
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
