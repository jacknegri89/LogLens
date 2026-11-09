import type { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';
import { AppError } from './errorHandler';
import { readClientHash } from './visitor';

const WINDOW_MS = 60 * 1000;

/** The most addresses tracked at once: first the ended windows are dropped, then the oldest. */
const MAX_TRACKED_CLIENTS = 10_000;

interface RequestWindow {
  startedAt: number;
  requests: number;
}

/**
 * Limits how many requests one address can send to the API in a minute.
 *
 * The count lives in this server instance's memory: on a serverless host each instance counts
 * on its own, so this stops bursts but is not a global quota. The hourly limit on analyses
 * (attemptLimit.ts) stays in the database and is shared by every instance.
 */
export function createApiRateLimiter(limitPerWindow: number, readNow: () => number = Date.now) {
  const windows = new Map<string, RequestWindow>();

  function dropEndedWindows(now: number) {
    for (const [clientHash, requestWindow] of windows) {
      if (now - requestWindow.startedAt >= WINDOW_MS) {
        windows.delete(clientHash);
      }
    }
  }

  function startWindow(clientHash: string, now: number): RequestWindow {
    const requestWindow: RequestWindow = { startedAt: now, requests: 0 };
    // Deleting first moves the address to the end of the map, so the map stays in start order.
    windows.delete(clientHash);
    windows.set(clientHash, requestWindow);
    if (windows.size > MAX_TRACKED_CLIENTS) {
      dropEndedWindows(now);
    }
    // Many addresses inside one minute must not grow the memory without limit: the oldest go first.
    while (windows.size > MAX_TRACKED_CLIENTS) {
      const [oldest] = windows.keys();
      windows.delete(oldest);
    }
    return requestWindow;
  }

  return function apiRateLimit(req: Request, res: Response, next: NextFunction) {
    if (limitPerWindow <= 0) {
      next();
      return;
    }

    const now = readNow();
    const clientHash = readClientHash(req);
    let requestWindow = windows.get(clientHash);
    if (!requestWindow || now - requestWindow.startedAt >= WINDOW_MS) {
      requestWindow = startWindow(clientHash, now);
    }

    requestWindow.requests += 1;
    if (requestWindow.requests > limitPerWindow) {
      const secondsLeft = Math.ceil((requestWindow.startedAt + WINDOW_MS - now) / 1000);
      res.setHeader('Retry-After', String(secondsLeft));
      throw new AppError(429, 'Too many requests. Try again in a minute.');
    }
    next();
  };
}

export const apiRateLimit = createApiRateLimiter(env.API_RATE_LIMIT_PER_MINUTE);
