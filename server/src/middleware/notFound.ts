import type { Request, Response } from 'express';

/**
 * Fallback for any route that didn't match. Returns a consistent JSON 404
 * with the same shape as `errorHandler`, so clients always get errors in
 * one predictable format.
 */
export function notFound(req: Request, res: Response) {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
      statusCode: 404,
    },
  });
}
