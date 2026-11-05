import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import {
  countAttemptsInLastHour,
  deleteExpiredAttempts,
  recordAttempt,
  removeAttempt,
} from '../repositories/analysisRepository';

/**
 * Saves this attempt before the AI is called, so a failed call still uses up the limit.
 * The count includes the attempt itself, so a refused attempt is removed again. Two
 * requests that arrive together can both be refused, but never both be allowed past the limit.
 * Attempts older than the window are removed first, so the stored hashes do not pile up.
 */
export async function reserveAttempt(clientHash: string): Promise<void> {
  await deleteExpiredAttempts();
  const attemptId = await recordAttempt(clientHash);
  const refusal = await findRefusal(clientHash);
  if (refusal) {
    await removeAttempt(attemptId);
    throw new AppError(429, refusal);
  }
}

/** The message for a limit that this attempt would go over, or null when it may go on. */
async function findRefusal(clientHash: string): Promise<string | null> {
  let clientCount: Promise<number> | number = 0;
  let globalCount: Promise<number> | number = 0;
  if (env.RATE_LIMIT_PER_HOUR > 0) {
    clientCount = countAttemptsInLastHour(clientHash);
  }
  if (env.GLOBAL_LIMIT_PER_HOUR > 0) {
    globalCount = countAttemptsInLastHour();
  }
  const [clientUsed, globalUsed] = await Promise.all([clientCount, globalCount]);
  if (clientUsed > env.RATE_LIMIT_PER_HOUR) {
    return `Limit reached: ${env.RATE_LIMIT_PER_HOUR} analyses per hour. Try again later.`;
  }
  if (globalUsed > env.GLOBAL_LIMIT_PER_HOUR) {
    return 'The demo is busy right now. Try again in a while.';
  }
  return null;
}
