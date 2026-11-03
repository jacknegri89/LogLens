import { describe, expect, it } from 'vitest';

import { parseMilliseconds, summarizeLatencies } from './latencyStats';

describe('parseMilliseconds', () => {
  it('reads values with and without a space', () => {
    expect(parseMilliseconds('1840ms')).toBe(1840);
    expect(parseMilliseconds('12.5 ms')).toBe(12.5);
  });

  it('rejects anything else', () => {
    expect(parseMilliseconds('12 s')).toBeNull();
    expect(parseMilliseconds('ms')).toBeNull();
    expect(parseMilliseconds('about 5ms')).toBeNull();
  });
});

describe('summarizeLatencies', () => {
  it('weights every value by how often it was seen', () => {
    const summary = summarizeLatencies(
      new Map([
        ['10ms', 3],
        ['100ms', 1],
      ]),
    );
    expect(summary).toEqual({ count: 4, min: 10, average: 32.5, p95: 100, max: 100 });
  });

  it('uses the nearest-rank p95', () => {
    const counts = new Map(
      Array.from({ length: 20 }, (_, index) => [`${index + 1}ms`, 1] as [string, number]),
    );
    expect(summarizeLatencies(counts)?.p95).toBe(19);
  });

  it('ignores values that are not latencies and returns null when none are', () => {
    expect(summarizeLatencies(new Map([['hello', 4]]))).toBeNull();
    expect(summarizeLatencies(new Map())).toBeNull();
    const mixed = new Map([
      ['hello', 4],
      ['7ms', 1],
    ]);
    expect(summarizeLatencies(mixed)?.count).toBe(1);
  });
});
