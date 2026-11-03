import type { ParsedLine } from '../types';

export interface WaterfallStep {
  line: ParsedLine;
  /** Time since the first step, or null when the lines carry no time. */
  offsetMs: number | null;
  /** Time since the previous step, or null for the first step or without time. */
  deltaMs: number | null;
  /** Bar position and width, as a percentage of the whole span. */
  leftPercent: number;
  widthPercent: number;
}

export interface Waterfall {
  steps: WaterfallStep[];
  /** Length of the whole span in milliseconds, or null when the steps are only ordered. */
  totalMs: number | null;
}

const MIN_BAR_PERCENT = 1.2;

/** Time order, with line order for ties; a line without a time takes the time of the line before it. */
export function orderSteps(lines: readonly ParsedLine[]): ParsedLine[] {
  const ranked: Array<{ line: ParsedLine; time: number | null }> = [];
  let carried: number | null = null;
  for (const line of [...lines].sort((a, b) => a.index - b.index)) {
    carried = line.timestamp ?? carried;
    ranked.push({ line, time: carried });
  }
  if (ranked.every((entry) => entry.time === null)) return ranked.map((entry) => entry.line);
  return ranked
    .sort((a, b) => (a.time ?? -Infinity) - (b.time ?? -Infinity) || a.line.index - b.line.index)
    .map((entry) => entry.line);
}

/** "+12ms", "+1.4s", "+2m 5s": the gap between two steps. */
export function formatDelta(milliseconds: number): string {
  const rounded = Math.round(Math.abs(milliseconds));
  const sign = milliseconds < 0 ? '-' : '+';
  if (rounded < 1000) return `${sign}${rounded}ms`;
  if (rounded < 60_000) return `${sign}${(rounded / 1000).toFixed(1).replace(/\.0$/, '')}s`;
  return `${sign}${Math.floor(rounded / 60_000)}m ${Math.floor((rounded % 60_000) / 1000)}s`;
}

function clampBar(left: number, width: number): { leftPercent: number; widthPercent: number } {
  const leftPercent = Math.min(100 - MIN_BAR_PERCENT, Math.max(0, left));
  return {
    leftPercent,
    widthPercent: Math.min(100 - leftPercent, Math.max(MIN_BAR_PERCENT, width)),
  };
}

function stepEnd(line: ParsedLine, offset: number, nextOffset: number | null): number {
  return offset + (line.latencyMs ?? (nextOffset === null ? 0 : nextOffset - offset));
}

function timedOffsets(ordered: readonly ParsedLine[]): number[] {
  let previous = ordered.find((line) => line.timestamp !== null)?.timestamp ?? 0;
  const first = previous;
  return ordered.map((line) => {
    previous = line.timestamp ?? previous;
    return previous - first;
  });
}

function buildTimed(ordered: readonly ParsedLine[], offsets: number[]): Waterfall {
  const ends = ordered.map((line, i) => stepEnd(line, offsets[i], offsets[i + 1] ?? null));
  const totalMs = [...ends, ...offsets].reduce((largest, value) => Math.max(largest, value), 0);
  const steps = ordered.map((line, i) => ({
    line,
    offsetMs: offsets[i],
    deltaMs: i === 0 || line.timestamp === null ? null : offsets[i] - offsets[i - 1],
    ...clampBar((offsets[i] / totalMs) * 100, ((ends[i] - offsets[i]) / totalMs) * 100),
  }));
  return { steps, totalMs };
}

function buildOrdered(ordered: readonly ParsedLine[]): Waterfall {
  const width = 100 / Math.max(1, ordered.length);
  const steps = ordered.map((line, i) => ({
    line,
    offsetMs: null,
    deltaMs: null,
    leftPercent: i * width,
    widthPercent: width,
  }));
  return { steps, totalMs: null };
}

/** The lines of one request as a waterfall. With no times, or all at one instant, steps are only ordered. */
export function buildWaterfall(lines: readonly ParsedLine[]): Waterfall {
  const ordered = orderSteps(lines);
  if (ordered.every((line) => line.timestamp === null)) return buildOrdered(ordered);
  const offsets = timedOffsets(ordered);
  return offsets.every((offset) => offset === 0) && ordered.every((line) => line.latencyMs === null)
    ? { ...buildOrdered(ordered), totalMs: 0 }
    : buildTimed(ordered, offsets);
}
