import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../middleware/errorHandler';
import { getSharedAnalysis } from '../repositories/analysisRepository';

/**
 * Read-only access to a report through its secret link. No visitor id is needed:
 * the token itself is the permission, which is why the token is long and random.
 */
export const sharedRouter = Router();

// The link is a secret: it must not be cached, indexed or passed on in a Referer header.
sharedRouter.use((_req: Request, res: Response, next: NextFunction) => {
  res.set({
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Referrer-Policy': 'no-referrer',
  });
  next();
});

// GET /api/shared/:token — the shared report, without the raw log.
sharedRouter.get('/:token', async (req: Request<{ token: string }>, res: Response) => {
  const analysis = await getSharedAnalysis(req.params.token);
  if (!analysis) {
    throw new AppError(404, 'This shared report does not exist or the link was revoked.');
  }
  res.json(analysis);
});
