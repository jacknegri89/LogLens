import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { tryReserveAttempt } from '../repositories/analysisRepository';

/**
 * Saves this attempt before the AI is called, so a failed call still uses up the limit. The
 * check and the saving happen in one locked database transaction (see tryReserveAttempt): requests
 * that arrive together cannot both pass the last free place, and a refused one leaves no trace.
 */
export async function reserveAttempt(clientHash: string): Promise<void> {
  const decision = await tryReserveAttempt(clientHash, {
    perClientPerHour: env.RATE_LIMIT_PER_HOUR,
    globalPerHour: env.GLOBAL_LIMIT_PER_HOUR,
  });
  if (decision === 'client-limit') {
    throw new AppError(
      429,
      `Limit reached: ${env.RATE_LIMIT_PER_HOUR} analyses per hour. Try again later.`,
    );
  }
  if (decision === 'global-limit') {
    throw new AppError(429, 'The demo is busy right now. Try again in a while.');
  }
}
