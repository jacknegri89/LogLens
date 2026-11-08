import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { AppError } from './errorHandler';
import { hashAddress, readVisitorId, requireVisitorOwner } from './visitor';

describe('readVisitorId', () => {
  it('accepts a random browser id', () => {
    expect(readVisitorId('3f2c9a1e-7b44-4c1d-9a55-0e1f2a3b4c5d')).toBe(
      '3f2c9a1e-7b44-4c1d-9a55-0e1f2a3b4c5d',
    );
  });

  it.each(['aaaaaaaaaaaaaaaaaaaa', '1234512345123451', '0000000000000000', 'abababababababab'])(
    'rejects an id that is too regular to be random: %s',
    (id) => {
      expect(readVisitorId(id)).toBe('');
    },
  );

  it('rejects a missing, short or unsafe id', () => {
    expect(readVisitorId(undefined)).toBe('');
    expect(readVisitorId('short')).toBe('');
    expect(readVisitorId("abcdefghijklmnop'; DROP TABLE")).toBe('');
  });
});

describe('hashAddress', () => {
  it('is stable and does not contain the address', () => {
    const hash = hashAddress('203.0.113.9');

    expect(hash).toBe(hashAddress('203.0.113.9'));
    expect(hash).not.toContain('203.0.113.9');
    expect(hash).not.toBe(hashAddress('203.0.113.10'));
  });
});

describe('requireVisitorOwner', () => {
  function callWithOwner(owner: string): { next: NextFunction } {
    const next = vi.fn();
    const res = { locals: { visitor: { owner, clientHash: 'hash' } } } as unknown as Response;
    requireVisitorOwner({} as Request, res, next);
    return { next };
  }

  it('passes a request that has a visitor id', () => {
    const { next } = callWithOwner('3f2c9a1e-7b44-4c1d-9a55-0e1f2a3b4c5d');

    expect(next).toHaveBeenCalledOnce();
  });

  it('refuses a request without a visitor id with 400', () => {
    const next = vi.fn();
    const res = { locals: { visitor: { owner: '', clientHash: 'hash' } } } as unknown as Response;

    expect(() => requireVisitorOwner({} as Request, res, next)).toThrow(AppError);
    expect(next).not.toHaveBeenCalled();
  });
});
