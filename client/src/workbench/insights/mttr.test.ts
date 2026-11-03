import { describe, expect, it } from 'vitest';

import type { Severity } from '../../lib/types';
import { DEFAULT_RANGE, estimateMttr } from './mttr';

const SEVERITIES: Severity[] = ['informational', 'low', 'medium', 'high', 'critical'];

describe('estimateMttr', () => {
  it('matches the documented examples', () => {
    expect(estimateMttr('Database', 'high')).toEqual({ min: 20, max: 60 });
    expect(estimateMttr('Security Attack', 'critical')).toEqual({ min: 60, max: 240 });
    expect(estimateMttr('Network', 'medium')).toEqual({ min: 10, max: 30 });
  });

  it('ignores the case and spaces of the category', () => {
    expect(estimateMttr('  database ', 'medium')).toEqual(estimateMttr('Database', 'medium'));
  });

  it('falls back to the default range for an unknown or empty category', () => {
    expect(estimateMttr('Something New', 'medium')).toEqual(DEFAULT_RANGE);
    expect(estimateMttr('', 'medium')).toEqual(DEFAULT_RANGE);
  });

  it('never lowers the range when the severity goes up and keeps min below max', () => {
    for (const category of ['Database', 'Network', 'Unknown']) {
      const ranges = SEVERITIES.map((severity) => estimateMttr(category, severity));
      ranges.forEach((range) => expect(range.min).toBeLessThanOrEqual(range.max));
      ranges.slice(1).forEach((range, index) => {
        expect(range.min).toBeGreaterThanOrEqual(ranges[index].min);
        expect(range.max).toBeGreaterThanOrEqual(ranges[index].max);
      });
    }
  });

  it('never returns less than 5 minutes', () => {
    expect(estimateMttr('Client Error', 'informational').min).toBe(5);
  });
});
