import type { ParsedLine } from '../types';

export interface LatencySummary {
  count: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

/** Every latency the log states, in line order. */
export function collectLatencies(lines: ParsedLine[]): number[] {
  const values: number[] = [];
  for (const line of lines) {
    if (line.latencyMs !== null) {
      values.push(line.latencyMs);
    }
  }
  return values;
}

/**
 * Nearest-rank percentile of an ascending list: the smallest value that at least
 * `fraction` of the samples do not exceed. It always returns a real sample, which is
 * what an operator expects to see when reading "p95" off a log.
 */
export function percentile(sortedAscending: number[], fraction: number): number {
  if (sortedAscending.length === 0) {
    return 0;
  }
  const rank = Math.ceil(fraction * sortedAscending.length);
  const index = Math.min(sortedAscending.length, Math.max(1, rank)) - 1;
  return sortedAscending[index];
}

/** p50, p95, p99 and max of the given latencies, or null when there are none. */
export function summarizeLatency(values: number[]): LatencySummary | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((first, second) => first - second);
  return {
    count: sorted.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted[sorted.length - 1],
  };
}

/** "850 ms" under one second, "1.25 s" above; the unit is part of the result. */
export function formatMilliseconds(value: number): string {
  if (value >= 1000) {
    return `${Number((value / 1000).toFixed(2))} s`;
  }
  return `${Number(value.toFixed(1))} ms`;
}
