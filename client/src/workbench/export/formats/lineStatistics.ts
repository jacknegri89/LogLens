import type { ParsedLine } from '../../types';

export interface LineStatistics {
  totalLines: number;
  levels: Record<string, number>;
  linesWithoutLevel: number;
  faultLines: number;
  firstTime: string | null;
  lastTime: string | null;
  services: { name: string; count: number }[];
  latency: { samples: number; averageMs: number; p95Ms: number; maxMs: number } | null;
}

const TOP_SERVICES = 10;

function countBy(values: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function timeRange(lines: readonly ParsedLine[]): Pick<LineStatistics, 'firstTime' | 'lastTime'> {
  let firstTime: number | null = null;
  let lastTime: number | null = null;
  for (const line of lines) {
    if (line.timestamp === null) {
      continue;
    }
    if (firstTime === null || line.timestamp < firstTime) {
      firstTime = line.timestamp;
    }
    if (lastTime === null || line.timestamp > lastTime) {
      lastTime = line.timestamp;
    }
  }
  if (firstTime === null || lastTime === null) {
    return { firstTime: null, lastTime: null };
  }
  return {
    firstTime: new Date(firstTime).toISOString(),
    lastTime: new Date(lastTime).toISOString(),
  };
}

function latencyOf(lines: readonly ParsedLine[]): LineStatistics['latency'] {
  const values = lines.map((line) => line.latencyMs).filter((value) => value !== null);
  if (values.length === 0) {
    return null;
  }
  values.sort((left, right) => left - right);
  const total = values.reduce((sum, value) => sum + value, 0);
  const p95 = values[Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1)];
  return {
    samples: values.length,
    averageMs: Math.round((total / values.length) * 10) / 10,
    p95Ms: p95,
    maxMs: values[values.length - 1],
  };
}

function topServices(lines: readonly ParsedLine[]): LineStatistics['services'] {
  const names = lines.map((line) => line.service).filter((name) => name !== null);
  const ranked = [...countBy(names)].map(([name, count]) => ({ name, count }));
  ranked.sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
  return ranked.slice(0, TOP_SERVICES);
}

/** Counts that describe the loaded lines: levels, faults, time span, busiest services, latency. */
export function computeLineStatistics(lines: readonly ParsedLine[]): LineStatistics {
  const levelled = lines.map((line) => line.level).filter((level) => level !== null);
  return {
    totalLines: lines.length,
    levels: Object.fromEntries(countBy(levelled)),
    linesWithoutLevel: lines.length - levelled.length,
    faultLines: lines.filter((line) => line.isFault).length,
    ...timeRange(lines),
    services: topServices(lines),
    latency: latencyOf(lines),
  };
}
