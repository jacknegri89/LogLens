import type { ErrorText } from '../content/errors';
import { RequestError } from './requestError';

const UNREACHABLE_PATTERN = /ECONNREFUSED|Failed to fetch|fetch failed|net::ERR_CONNECTION/i;

/**
 * Turns a failure into a sentence the visitor can act on, in the page language. The server's
 * own message is kept; the fallback is for a failure that is not an Error.
 */
export function errorMessage(error: unknown, fallback: string, text: ErrorText): string {
  if (!(error instanceof Error)) {
    return fallback;
  }
  if (error instanceof RequestError && error.message === '')
    {
      return text.requestFailed(error.status);
    }
  if (UNREACHABLE_PATTERN.test(error.message)) {
    return text.unreachable;
  }
  return error.message;
}
