import { RequestError } from './requestError';

// Gateway answers that mean the backend or its database is down, not that the request is wrong.
const UNAVAILABLE_STATUSES = [502, 503, 504];

/**
 * Whether a failed request means the server cannot be reached, so the copy kept in this
 * browser may stand in for it. A refusal such as 400, 404 or 429 is a real answer and is not.
 */
export function isServerUnreachable(failure: unknown): boolean {
  if (failure instanceof RequestError) return UNAVAILABLE_STATUSES.includes(failure.status);
  // `fetch` rejects with a TypeError when there is no network or the connection fails.
  return failure instanceof TypeError;
}
