import type { NextFunction, Request, Response } from 'express';

/**
 * An error we throw on purpose, carrying an HTTP status code.
 * Example: `throw new AppError(400, 'Log text is empty')`.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Centralized error handler. Express recognizes a middleware as an error
 * handler ONLY if it has these four parameters, so `next` must stay even
 * though it is unused. Register this AFTER all routes.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else {
    // Unexpected errors are bugs — log the full error so we can debug them.
    console.error(err);
  }

  res.status(statusCode).json({
    error: { message, statusCode },
  });
}
