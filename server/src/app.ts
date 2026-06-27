import cors from 'cors';
import express from 'express';
import morgan from 'morgan';

import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { healthRouter } from './routes/health';

/**
 * Build and configure the Express application.
 *
 * Note: this function does NOT call `listen()` — it only wires up the app.
 * Keeping the network binding out of here lets us import `createApp()` in
 * tests and send requests to it without occupying a real port.
 */
export function createApp() {
  const app = express();

  // Allow the frontend (a different origin in dev) to call the API.
  app.use(cors());

  // Parse JSON request bodies. Logs can be sizeable, so raise the limit.
  app.use(express.json({ limit: '2mb' }));

  // Log each request in dev/prod, but stay quiet during tests.
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Routes
  app.use('/api/health', healthRouter);

  // These two must come LAST, in this order:
  app.use(notFound); // anything unmatched -> 404
  app.use(errorHandler); // anything thrown -> consistent error JSON

  return app;
}
