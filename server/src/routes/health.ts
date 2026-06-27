import { Router } from 'express';
import type { Request, Response } from 'express';

/**
 * Health-check route. A tiny endpoint that proves the server is up.
 * Useful for uptime monitors, Docker health checks, and CI smoke tests.
 */
export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'loglens-server',
    timestamp: new Date().toISOString(),
  });
});
