import { describe, expect, it } from 'vitest';

import { formatClusterTime } from './clusterTime';

const MOMENT = Date.UTC(2024, 2, 5, 9, 4, 7);

describe('formatClusterTime', () => {
  it('shows month, day and time in UTC', () => {
    expect(formatClusterTime(MOMENT, 'utc')).toBe('03-05 09:04:07');
  });

  it('shows UTC in relative mode, which has no meaning for a single moment', () => {
    expect(formatClusterTime(MOMENT, 'relative')).toBe('03-05 09:04:07');
  });

  it('shows a local time with the same parts', () => {
    expect(formatClusterTime(MOMENT, 'local')).toMatch(/\d{2}:\d{2}:\d{2}/);
  });
});
