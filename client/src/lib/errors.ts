import { ERROR_TEXT } from '../content/errors';

const UNREACHABLE_PATTERN = /ECONNREFUSED|Failed to fetch|fetch failed|net::ERR_CONNECTION/i;

/** Turns a failed request into a sentence the visitor can act on. */
export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : ERROR_TEXT.unknown;
  return UNREACHABLE_PATTERN.test(message) ? ERROR_TEXT.unreachable : message;
}

/** The message of an error, or the fallback when it is not an Error. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
