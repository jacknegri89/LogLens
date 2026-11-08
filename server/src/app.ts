import cors from 'cors';
import express from 'express';
import morgan from 'morgan';

import { env } from './config/env';
import { apiRateLimit } from './middleware/apiRateLimit';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { identifyVisitor } from './middleware/visitor';
import { analysesRouter } from './routes/analyses';
import { cronRouter } from './routes/cron';
import { healthRouter } from './routes/health';
import { sharedRouter } from './routes/shared';

/**
 * In production no origin means "same site only": an empty or wildcard value would let any
 * web page call the API from its visitors' browsers and use up the shared hourly quota.
 */
function corsOrigin(): string | false {
  const open = env.CORS_ORIGIN === '' || env.CORS_ORIGIN === '*';
  if (open && env.NODE_ENV === 'production') {
    return false;
  }
  return env.CORS_ORIGIN;
}

export function isSensitiveRequestUrl(url: string): boolean {
  return /^\/api\/shared(?:\/|\?|$)/i.test(url);
}

/**
 * Build and configure the Express application.
 *
 * Note: this function does NOT call `listen()` — it only wires up the app.
 * Keeping the network binding out of here lets us import `createApp()` in
 * tests and send requests to it without occupying a real port.
 */
export function createApp() {
  const app = express();

  // Allow the frontend to call the API. CORS_ORIGIN defaults to * in dev and
  // is set to the Render frontend URL in production.
  app.use(cors({ origin: corsOrigin() }));

  // Refuse an address that sends too many requests, before reading any request body.
  app.use('/api', apiRateLimit);

  // Parse JSON request bodies. Logs can be sizeable, so raise the limit.
  app.use(express.json({ limit: '2mb' }));

  // Log each request in dev/prod, but stay quiet during tests.
  if (env.NODE_ENV !== 'test') {
    // Shared URLs contain bearer tokens: never write them to application logs.
    app.use(morgan('dev', { skip: (req) => isSensitiveRequestUrl(req.originalUrl) }));
  }

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/analyses', identifyVisitor, analysesRouter);
  // Scheduled by Vercel Cron; each call must carry CRON_SECRET (checked inside the router).
  app.use('/api/cron', cronRouter);
  // Shared reports are public by their secret link, so they skip the visitor check.
  app.use('/api/shared', sharedRouter);

  // These two must come LAST, in this order:
  app.use(notFound); // anything unmatched -> 404
  app.use(errorHandler); // anything thrown -> consistent error JSON

  return app;
}
