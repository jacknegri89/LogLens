import cors from 'cors';
import express from 'express';
import morgan from 'morgan';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { identifyVisitor } from './middleware/visitor';
import { analysesRouter } from './routes/analyses';
import { healthRouter } from './routes/health';
import { ingestRouter } from './routes/ingest';
import { sharedRouter } from './routes/shared';

/**
 * In production no origin means "same site only": an empty or wildcard value would let any
 * web page call the API from its visitors' browsers and use up the shared hourly quota.
 */
function corsOrigin(): string | false {
  const open = env.CORS_ORIGIN === '' || env.CORS_ORIGIN === '*';
  return open && env.NODE_ENV === 'production' ? false : env.CORS_ORIGIN;
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

  // Parse JSON request bodies. Logs can be sizeable, so raise the limit.
  app.use(express.json({ limit: '2mb' }));

  // Log each request in dev/prod, but stay quiet during tests.
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/analyses', identifyVisitor, analysesRouter);
  app.use('/api/ingest', identifyVisitor, ingestRouter);
  // Shared reports are public by their secret link, so they skip the visitor check.
  app.use('/api/shared', sharedRouter);

  // These two must come LAST, in this order:
  app.use(notFound); // anything unmatched -> 404
  app.use(errorHandler); // anything thrown -> consistent error JSON

  return app;
}
