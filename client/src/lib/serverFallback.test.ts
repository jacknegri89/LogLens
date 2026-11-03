import { describe, expect, it } from 'vitest';

import { RequestError } from './requestError';
import { isServerUnreachable } from './serverFallback';

describe('isServerUnreachable', () => {
  it('is true for a network failure', () => {
    expect(isServerUnreachable(new TypeError('Failed to fetch'))).toBe(true);
  });

  it.each([502, 503, 504])('is true for HTTP %i', (status) => {
    expect(isServerUnreachable(new RequestError(status))).toBe(true);
  });

  it.each([400, 404, 429, 500])('is false for HTTP %i', (status) => {
    expect(isServerUnreachable(new RequestError(status, 'refused'))).toBe(false);
  });

  it('is false for any other failure', () => {
    expect(isServerUnreachable(new Error('boom'))).toBe(false);
    expect(isServerUnreachable('text')).toBe(false);
  });
});
