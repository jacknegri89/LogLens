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
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof Error && 'type' in error && error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON request body.';
  } else if (error instanceof Error && 'type' in error && error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large.';
  } else {
    // Unexpected errors are bugs — log the full error so we can debug them.
    console.error(error);
  }

  res.status(statusCode).json({
    error: { message, statusCode },
  });
}
