import { describe, expect, it } from 'vitest';

import { withCount } from './plural';

describe('withCount', () => {
  it('uses the singular for exactly one', () => {
    expect(withCount(1, ['riga', 'righe'])).toBe('1 riga');
  });

  it('uses the plural for zero and for many', () => {
    expect(withCount(0, ['line', 'lines'])).toBe('0 lines');
    expect(withCount(2, ['line', 'lines'])).toBe('2 lines');
  });

  it('keeps a unit that does not change in the plural', () => {
    expect(withCount(5, ['IP', 'IP'])).toBe('5 IP');
  });
});
