export interface LatencySummary {
  count: number;
  min: number;
  average: number;
  p95: number;
  max: number;
}

/** "1840ms" or "12.5 ms" as a number of milliseconds, or null when it is not one. */
export function parseMilliseconds(value: string): number | null {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*ms$/i);
  if (match) {
    return Number.parseFloat(match[1]);
  }
  return null;
}

/** Nearest-rank percentile of an ascending list. */
function percentile(sortedValues: readonly number[], fraction: number): number {
  const rank = Math.ceil(fraction * sortedValues.length);
  return sortedValues[Math.max(0, rank - 1)];
}

/** Min, average, p95 and max over every occurrence, or null when no value is a latency. */
export function summarizeLatencies(
  valueCounts: ReadonlyMap<string, number>,
): LatencySummary | null {
  const samples: number[] = [];
  for (const [value, count] of valueCounts) {
    const milliseconds = parseMilliseconds(value);
    if (milliseconds === null) {
      continue;
    }
    for (let repeat = 0; repeat < count; repeat += 1) samples.push(milliseconds);
  }
  if (samples.length === 0) {
    return null;
  }
  samples.sort((first, second) => first - second);
  const total = samples.reduce((sum, sample) => sum + sample, 0);
  return {
    count: samples.length,
    min: samples[0],
    average: total / samples.length,
    p95: percentile(samples, 0.95),
    max: samples[samples.length - 1],
  };
}
