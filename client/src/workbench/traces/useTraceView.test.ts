import { describe, expect, it } from 'vitest';

import { parseLines } from '../core/basicParse';
import { buildCorrelations } from './correlationIds';
import { matchesFilter } from './useTraceView';

describe('matchesFilter', () => {
  const [correlation] = buildCorrelations(parseLines('INFO ok trace_id=Abc-123'));

  it('matches part of an id, ignoring case and surrounding spaces', () => {
    expect(matchesFilter(correlation, 'abc')).toBe(true);
    expect(matchesFilter(correlation, '  C-12 ')).toBe(true);
  });

  it('matches everything for an empty filter and nothing for a different text', () => {
    expect(matchesFilter(correlation, '')).toBe(true);
    expect(matchesFilter(correlation, 'zzz')).toBe(false);
  });
});
