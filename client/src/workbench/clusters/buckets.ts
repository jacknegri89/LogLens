import type { ParsedLine } from '../types';

export const BUCKET_COUNT = 24;
const MIN_TIMED_SHARE = 0.6;

export interface BucketPlan {
  /** `time` spreads lines by their timestamps, `position` by their place in the log. */
  mode: 'time' | 'position';
  /** First timestamp (time mode). */
  start: number;
  /** Time covered, or the number of lines in position mode. */
  span: number;
  bucketCount: number;
}

/** One plan for every cluster, so their charts share the same horizontal scale. */
export function planBuckets(lines: readonly ParsedLine[], bucketCount = BUCKET_COUNT): BucketPlan {
  let first = Infinity;
  let last = -Infinity;
  let timed = 0;
  for (const line of lines) {
    if (line.timestamp === null) {
      continue;
    }
    timed += 1;
    first = Math.min(first, line.timestamp);
    last = Math.max(last, line.timestamp);
  }
  const usesTime = lines.length > 0 && timed / lines.length >= MIN_TIMED_SHARE && last > first;
  if (usesTime) {
    return { mode: 'time', start: first, span: last - first, bucketCount };
  }
  return { mode: 'position', start: 0, span: lines.length, bucketCount };
}

/** The bucket a value falls in; the very end of the range belongs to the last bucket. */
export function bucketOf(offset: number, plan: BucketPlan): number {
  if (plan.span <= 0) {
    return 0;
  }
  const bucket = Math.floor((offset / plan.span) * plan.bucketCount);
  return Math.min(plan.bucketCount - 1, Math.max(0, bucket));
}

/** How many of the given lines (by position in `lines`) fall in each bucket. */
export function countBuckets(
  plan: BucketPlan,
  lines: readonly ParsedLine[],
  positions: readonly number[],
): number[] {
  const counts = new Array<number>(plan.bucketCount).fill(0);
  for (const position of positions) {
    if (plan.mode === 'position') {
      counts[bucketOf(position, plan)] += 1;
      continue;
    }
    const timestamp = lines[position]?.timestamp;
    if (timestamp != null) {
      counts[bucketOf(timestamp - plan.start, plan)] += 1;
    }
  }
  return counts;
}
