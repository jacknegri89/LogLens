import { describe, expect, it } from 'vitest';

import { hashAddress, readVisitorId } from './visitor';

describe('readVisitorId', () => {
  it('accepts a random browser id', () => {
    expect(readVisitorId('3f2c9a1e-7b44-4c1d-9a55-0e1f2a3b4c5d')).toBe(
      '3f2c9a1e-7b44-4c1d-9a55-0e1f2a3b4c5d',
    );
  });

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
