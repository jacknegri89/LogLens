import { describe, expect, it } from 'vitest';

import { parseLine } from './basicParse';
import { findPreviousTimed, formatClock, formatGap, formatLineTime } from './timeFormat';

const FIRST = parseLine('2026-11-03T09:14:07.120Z INFO started', 0);
const SECOND = parseLine('2026-11-03T09:14:08.370Z INFO ready', 1);
const UNTIMED = parseLine('    at main (/app/index.js:1:1)', 2);

describe('formatGap', () => {
  it('keeps small gaps in milliseconds', () => {
    expect(formatGap(0)).toBe('+0ms');
    expect(formatGap(12)).toBe('+12ms');
    expect(formatGap(999)).toBe('+999ms');
  });

  it('switches to seconds, minutes, hours and days for big gaps', () => {
    expect(formatGap(1250)).toBe('+1.2s');
    expect(formatGap(42_900)).toBe('+42s');
    expect(formatGap(3 * 60_000 + 5000)).toBe('+3m');
    expect(formatGap(2 * 3_600_000 + 1)).toBe('+2h');
    expect(formatGap(4 * 86_400_000)).toBe('+4d');
  });

  it('marks a step back in time with a minus', () => {
    expect(formatGap(-1500)).toBe('-1.5s');
    expect(formatGap(-7)).toBe('-7ms');
  });
});

describe('formatClock', () => {
  it('writes the UTC clock with milliseconds', () => {
    expect(formatClock(Date.parse('2026-11-03T09:04:07.005Z'), 'utc')).toBe('09:04:07.005');
  });

  it('writes the local clock in the browser zone', () => {
    const timestamp = Date.parse('2026-11-03T09:04:07.005Z');
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    expect(formatClock(timestamp, 'local')).toBe(
      `${hours}:${String(date.getMinutes()).padStart(2, '0')}:07.005`,
    );
  });
});

describe('formatLineTime', () => {
  it('gives an empty text for a line without time', () => {
    expect(formatLineTime(UNTIMED, FIRST, 'utc')).toBe('');
    expect(formatLineTime(UNTIMED, FIRST, 'relative')).toBe('');
  });

  it('shows the gap from the previous timed line in relative mode', () => {
    expect(formatLineTime(SECOND, FIRST, 'relative')).toBe('+1.2s');
  });

  it('anchors the first timed line on the UTC clock in relative mode', () => {
    expect(formatLineTime(FIRST, null, 'relative')).toBe('09:14:07.120');
    expect(formatLineTime(FIRST, UNTIMED, 'relative')).toBe('09:14:07.120');
  });

  it('shows the clock in UTC mode', () => {
    expect(formatLineTime(SECOND, FIRST, 'utc')).toBe('09:14:08.370');
  });
});

describe('findPreviousTimed', () => {
  it('points each line at the closest earlier line with a time', () => {
    expect(Array.from(findPreviousTimed([FIRST, UNTIMED, SECOND, UNTIMED]))).toEqual([-1, 0, 0, 2]);
  });

  it('handles an empty log', () => {
    expect(findPreviousTimed([]).length).toBe(0);
  });
});
