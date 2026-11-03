import { describe, expect, it } from 'vitest';

import { parseLines } from '../core/basicParse';
import { buildWaterfall, formatDelta, orderSteps } from './waterfall';

describe('formatDelta', () => {
  it('writes milliseconds, seconds and minutes', () => {
    expect(formatDelta(12)).toBe('+12ms');
    expect(formatDelta(0)).toBe('+0ms');
    expect(formatDelta(1400)).toBe('+1.4s');
    expect(formatDelta(2000)).toBe('+2s');
    expect(formatDelta(125_000)).toBe('+2m 5s');
  });

  it('keeps the sign of a negative gap', () => {
    expect(formatDelta(-30)).toBe('-30ms');
  });
});

describe('orderSteps', () => {
  it('sorts by time and keeps line order for equal times', () => {
    const lines = parseLines(
      ['2024-01-01T00:00:02Z b', '2024-01-01T00:00:01Z a', '2024-01-01T00:00:02Z c'].join('\n'),
    );
    expect(orderSteps(lines).map((line) => line.message)).toEqual(['a', 'b', 'c']);
  });

  it('keeps log order when no line has a time', () => {
    expect(orderSteps(parseLines('x\ny\nz')).map((line) => line.message)).toEqual(['x', 'y', 'z']);
  });

  it('keeps a line without a time right after the line before it', () => {
    const lines = parseLines('2024-01-01T00:00:01Z a\ncontinued\n2024-01-01T00:00:02Z b');
    expect(orderSteps(lines).map((line) => line.message)).toEqual(['a', 'continued', 'b']);
  });
});

describe('buildWaterfall', () => {
  const lines = parseLines(
    [
      '2024-01-01T00:00:00.000Z INFO [gateway] in',
      '2024-01-01T00:00:00.100Z INFO [orders] work',
      '2024-01-01T00:00:01.000Z ERROR [payments] boom',
    ].join('\n'),
  );

  it('gives each step its offset and its delta from the previous step', () => {
    const { steps, totalMs } = buildWaterfall(lines);
    expect(steps.map((step) => step.offsetMs)).toEqual([0, 100, 1000]);
    expect(steps.map((step) => step.deltaMs)).toEqual([null, 100, 900]);
    expect(totalMs).toBe(1000);
  });

  it('places bars inside the span, from 0 to 100 percent', () => {
    const { steps } = buildWaterfall(lines);
    expect(steps[0].leftPercent).toBe(0);
    expect(steps[1].leftPercent).toBeCloseTo(10);
    expect(steps[1].widthPercent).toBeCloseTo(90);
    for (const step of steps) {
      expect(step.leftPercent + step.widthPercent).toBeLessThanOrEqual(100.0001);
      expect(step.widthPercent).toBeGreaterThan(0);
    }
  });

  it('sizes a bar by the latency of the step when it has one', () => {
    const timed = parseLines('2024-01-01T00:00:00Z INFO a took 250ms\n2024-01-01T00:00:01Z INFO b');
    const { steps } = buildWaterfall(timed);
    expect(steps[0].widthPercent).toBeCloseTo(25);
  });

  it('spreads steps evenly when the lines have no time', () => {
    const { steps, totalMs } = buildWaterfall(parseLines('a\nb\nc\nd'));
    expect(totalMs).toBeNull();
    expect(steps.map((step) => step.leftPercent)).toEqual([0, 25, 50, 75]);
    expect(steps.every((step) => step.offsetMs === null && step.deltaMs === null)).toBe(true);
  });

  it('does not divide by zero when every line shares one instant', () => {
    const { steps, totalMs } = buildWaterfall(
      parseLines('2024-01-01T00:00:00Z INFO a\n2024-01-01T00:00:00Z INFO b'),
    );
    expect(totalMs).toBe(0);
    expect(steps.every((step) => Number.isFinite(step.leftPercent))).toBe(true);
  });

  it('returns no steps for no lines', () => {
    expect(buildWaterfall([])).toEqual({ steps: [], totalMs: null });
  });
});
