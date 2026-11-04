import { timingSafeEqual } from 'node:crypto';

import { Router } from 'express';
import type { Request, Response } from 'express';

import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { purgeExpiredAnalyses } from '../services/retention';

/**
 * Routes called by Vercel Cron, on the schedule set in vercel.json. They are not for visitors:
 * each call must carry the CRON_SECRET, so a stranger cannot run the cleanup by hand.
 */
export const cronRouter = Router();

/** Compares the header with the expected value in constant time, so timing does not reveal it. */
function isAuthorized(authorizationHeader: string | undefined): boolean {
  if (!env.CRON_SECRET || !authorizationHeader) {
    return false;
  }
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const received = Buffer.from(authorizationHeader);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// GET /api/cron/retention — deletes the analyses past the retention period, for everyone.
cronRouter.get('/retention', async (req: Request, res: Response) => {
  if (!isAuthorized(req.get('authorization'))) {
    throw new AppError(401, 'Not allowed.');
  }
  const deleted = await purgeExpiredAnalyses();
  res.json({ deleted });
});
