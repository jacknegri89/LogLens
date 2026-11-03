import { timingSafeEqual } from 'node:crypto';

import { Router } from 'express';
import type { Request, Response } from 'express';

import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import type { Visitor } from '../middleware/visitor';
import { createAnalysisBodySchema } from '../schemas/createAnalysis';
import { reserveAttempt } from '../services/attemptLimit';
import { analyzeAndSave } from '../services/saveAnalysis';
import { parseLanguage } from '../types/language';

/**
 * Lets another application send a log over HTTP to be saved and analyzed. It is closed unless
 * INGEST_TOKEN is set, and then every call must carry that token.
 */
export const ingestRouter = Router();

const INGEST_OWNER = 'ingest';

/** Compares the secret without leaking, through timing, how many characters matched. */
export function isValidIngestToken(header: string | undefined, expected: string): boolean {
  const received = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes)
  );
}

// POST /api/ingest — analyze a log sent by an application and save it.
ingestRouter.post('/', async (req: Request, res: Response) => {
  if (!env.INGEST_TOKEN) {
    throw new AppError(404, 'Not found.');
  }
  if (!isValidIngestToken(req.get('Authorization'), env.INGEST_TOKEN)) {
    throw new AppError(401, 'Missing or invalid ingest token.');
  }
  const parsed = createAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid request body');
  }
  const visitor = res.locals.visitor as Visitor;
  await reserveAttempt(visitor.clientHash);

  const saved = await analyzeAndSave(
    { ...parsed.data, source: 'ingest' },
    { owner: visitor.owner || INGEST_OWNER, clientHash: visitor.clientHash },
    parseLanguage(req.get('X-Language')),
  );
  res.status(201).json({
    id: saved.id,
    title: saved.title,
    severity: saved.severity,
    category: saved.category,
    createdAt: saved.createdAt,
  });
});
