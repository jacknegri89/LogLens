import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { createApiRateLimiter } from './apiRateLimit';

vi.mock('./visitor', () => ({
  readClientHash: (req: Request) => String(req.headers['x-test-client'] ?? 'default-client'),
}));

function requestFrom(clientName: string): Request {
  return { headers: { 'x-test-client': clientName } } as unknown as Request;
}

function makeResponse() {
  const setHeader = vi.fn();
  return { response: { setHeader } as unknown as Response, setHeader };
}

describe('createApiRateLimiter', () => {
  it('lets a client send requests up to the limit', () => {
    const limiter = createApiRateLimiter(3, () => 0);
    const next = vi.fn();

    for (let call = 0; call < 3; call += 1) {
      limiter(requestFrom('alice'), makeResponse().response, next);
    }

    expect(next).toHaveBeenCalledTimes(3);
  });

  it('refuses the request over the limit with 429 and a Retry-After header', () => {
    const limiter = createApiRateLimiter(2, () => 10_000);
    const next = vi.fn();
    limiter(requestFrom('alice'), makeResponse().response, next);
    limiter(requestFrom('alice'), makeResponse().response, next);
    const { response, setHeader } = makeResponse();

    expect(() => limiter(requestFrom('alice'), response, next)).toThrowError(
      expect.objectContaining({ statusCode: 429 }),
    );
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('counts each client on its own', () => {
    const limiter = createApiRateLimiter(1, () => 0);
    const next = vi.fn();
    limiter(requestFrom('alice'), makeResponse().response, next);

    limiter(requestFrom('bob'), makeResponse().response, next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('starts a new window after a minute', () => {
    let now = 0;
    const limiter = createApiRateLimiter(1, () => now);
    const next = vi.fn();
    limiter(requestFrom('alice'), makeResponse().response, next);

    now = 60_000;
    limiter(requestFrom('alice'), makeResponse().response, next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the limit is 0', () => {
    const limiter = createApiRateLimiter(0, () => 0);
    const next = vi.fn();

    for (let call = 0; call < 50; call += 1) {
      limiter(requestFrom('alice'), makeResponse().response, next);
    }

    expect(next).toHaveBeenCalledTimes(50);
  });
});
