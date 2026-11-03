import { describe, expect, it } from 'vitest';

import { parseLines } from '../core/basicParse';
import { collectLatencies, formatMilliseconds, percentile, summarizeLatency } from './latency';

const ONE_TO_HUNDRED = Array.from({ length: 100 }, (_, index) => index + 1);

describe('percentile', () => {
  it('returns the nearest-rank sample of a known list', () => {
    expect(percentile(ONE_TO_HUNDRED, 0.5)).toBe(50);
    expect(percentile(ONE_TO_HUNDRED, 0.95)).toBe(95);
    expect(percentile(ONE_TO_HUNDRED, 0.99)).toBe(99);
  });

  it('handles a single sample and the extremes', () => {
    expect(percentile([7], 0.99)).toBe(7);
    expect(percentile(ONE_TO_HUNDRED, 0)).toBe(1);
    expect(percentile(ONE_TO_HUNDRED, 1)).toBe(100);
  });

  it('returns 0 for no samples', () => {
    expect(percentile([], 0.5)).toBe(0);
  });
});

describe('summarizeLatency', () => {
  it('summarizes an unsorted list without changing it', () => {
    const values = [30, 10, 20, 40];

    expect(summarizeLatency(values)).toEqual({ count: 4, p50: 20, p95: 40, p99: 40, max: 40 });
    expect(values).toEqual([30, 10, 20, 40]);
  });

  it('is null when there is no latency', () => {
    expect(summarizeLatency([])).toBeNull();
  });
});

describe('collectLatencies', () => {
  it('keeps only the lines that state a latency', () => {
    const lines = parseLines('GET /a took 12ms\nno latency here\nPOST /b latency=30ms');

    expect(collectLatencies(lines)).toEqual([12, 30]);
  });
});

describe('formatMilliseconds', () => {
  it('uses ms under a second and seconds above', () => {
    expect(formatMilliseconds(850)).toBe('850 ms');
    expect(formatMilliseconds(12.34)).toBe('12.3 ms');
    expect(formatMilliseconds(1250)).toBe('1.25 s');
    expect(formatMilliseconds(2000)).toBe('2 s');
  });
});
