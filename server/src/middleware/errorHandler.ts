import type { NextFunction, Request, Response } from 'express';

import { maskSecrets } from '../analysis/masking';

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

/** Codes that say the database (or the network to it) is not reachable, not that the request is wrong. */
const DATABASE_UNAVAILABLE_CODES = new Set([
  'P1001', // Prisma: cannot reach the database server
  'P1002', // Prisma: the database server timed out
  'P1008', // Prisma: operation timed out
  'P1017', // Prisma: the server closed the connection
  'P2024', // Prisma: timed out fetching a connection from the pool
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  '57P01', // PostgreSQL: the administrator shut the server down
  '53300', // PostgreSQL: too many connections
]);

const MAX_LOGGED_MESSAGE_CHARS = 200;
const MAX_LOGGED_FRAMES = 5;

function codeOf(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error;
    if (typeof code === 'string') {
      return code;
    }
  }
  return undefined;
}

/** True when the failure is the database being unreachable: the visitor can retry, nothing is wrong with the request. */
export function isDatabaseUnavailable(error: unknown): boolean {
  const code = codeOf(error);
  if (code !== undefined && DATABASE_UNAVAILABLE_CODES.has(code)) {
    return true;
  }
  if (error instanceof Error && error.name === 'PrismaClientInitializationError') {
    return true;
  }
  if (error instanceof Error && error.cause !== undefined) {
    return isDatabaseUnavailable(error.cause);
  }
  return false;
}

/**
 * What goes to the server log for an unexpected error. A database error can carry the query with
 * its arguments, and the arguments of saving an analysis are the visitor's log: so the log gets the
 * kind of error, its code, the first meaningful line of the message (secrets masked) and a few
 * stack frames, never the whole message.
 */
export function describeErrorForLog(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { type: typeof error };
  }
  const firstLine = error.message.split('\n').find((line) => line.trim() !== '') ?? '';
  const frames = (error.stack ?? '')
    .split('\n')
    .filter((line) => line.trimStart().startsWith('at '))
    .slice(0, MAX_LOGGED_FRAMES);
  return {
    name: error.name,
    code: codeOf(error),
    message: maskSecrets(firstLine.trim().slice(0, MAX_LOGGED_MESSAGE_CHARS)).text,
    frames,
  };
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
  } else if (isDatabaseUnavailable(error)) {
    statusCode = 503;
    message = 'The service is temporarily unavailable. Try again in a moment.';
    console.error('Database unavailable', describeErrorForLog(error));
  } else {
    // Unexpected errors are bugs: log what is needed to find them, never the data they carry.
    console.error('Unexpected error', describeErrorForLog(error));
  }

  res.status(statusCode).json({
    error: { message, statusCode },
  });
}
