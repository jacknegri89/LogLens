import { describe, expect, it } from 'vitest';

import { parseLines } from '../core/basicParse';
import { bucketOf, countBuckets, planBuckets } from './buckets';

function timedLines(seconds: number[]) {
  return parseLines(
    seconds
      .map((second) => `2024-01-01T00:00:${String(second).padStart(2, '0')}Z INFO tick`)
      .join('\n'),
  );
}

describe('planBuckets', () => {
  it('uses time when most lines have a timestamp', () => {
    const plan = planBuckets(timedLines([0, 10, 20]));
    expect(plan).toMatchObject({ mode: 'time', span: 20_000 });
  });

  it('falls back to line position when fewer than 60% have a time', () => {
    const lines = parseLines('2024-01-01T00:00:00Z INFO a\nno time\nno time\nno time');
    expect(planBuckets(lines).mode).toBe('position');
  });

  it('uses position when every timestamp is the same instant, and for an empty log', () => {
    expect(planBuckets(timedLines([5, 5, 5])).mode).toBe('position');
    expect(planBuckets([])).toMatchObject({ mode: 'position', span: 0 });
  });
});

describe('bucketOf', () => {
  const plan = { mode: 'time' as const, start: 0, span: 100, bucketCount: 10 };

  it('maps offsets to buckets and puts the end of the range in the last one', () => {
    expect(bucketOf(0, plan)).toBe(0);
    expect(bucketOf(9.9, plan)).toBe(0);
    expect(bucketOf(10, plan)).toBe(1);
    expect(bucketOf(100, plan)).toBe(9);
  });

  it('clamps values outside the range and survives an empty span', () => {
    expect(bucketOf(-5, plan)).toBe(0);
    expect(bucketOf(500, plan)).toBe(9);
    expect(bucketOf(3, { ...plan, span: 0 })).toBe(0);
  });
});

describe('countBuckets', () => {
  it('counts members by time and skips members without a time', () => {
    const lines = parseLines(
      [
        '2024-01-01T00:00:00Z a',
        '2024-01-01T00:00:10Z b',
        'no time',
        '2024-01-01T00:00:20Z c',
      ].join('\n'),
    );
    const plan = { ...planBuckets(lines), bucketCount: 2 };
    expect(countBuckets(plan, lines, [0, 1, 2, 3])).toEqual([1, 2]);
  });

  it('counts members by position when there are not enough times', () => {
    const lines = parseLines('a\nb\nc\nd');
    const plan = { ...planBuckets(lines), bucketCount: 2 };
    expect(countBuckets(plan, lines, [0, 1, 3])).toEqual([2, 1]);
    expect(countBuckets(plan, lines, [])).toEqual([0, 0]);
  });
});
