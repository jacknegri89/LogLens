import { describe, expect, it } from 'vitest';

import { parseLine } from '../../core/basicParse';
import {
  clampLineCount,
  createRandom,
  createScenario,
  DEFAULT_SCENARIO_LINES,
  MAX_TAIL_LINES,
  nextDelayMs,
  SCENARIO_KINDS,
} from './scenarios';

const SEEDS = [1, 7, 42, 2025, 987654321];

function levelsOf(lines: string[]) {
  return lines.map((line, index) => parseLine(line, index).level);
}

describe('createScenario', () => {
  it.each(SCENARIO_KINDS)('%s always ends with exactly one FATAL line', (kind) => {
    for (const seed of SEEDS) {
      const lines = createScenario({ kind, seed });
      const levels = levelsOf(lines);
      expect(levels.filter((level) => level === 'FATAL')).toHaveLength(1);
      expect(levels[levels.length - 1]).toBe('FATAL');
      expect(lines[lines.length - 1]).toContain('[FATAL]');
    }
  });

  it.each(SCENARIO_KINDS)('%s escalates: more warnings and errors late than early', (kind) => {
    const lines = createScenario({ kind, seed: 11, lineCount: 200 });
    const levels = levelsOf(lines.slice(0, -1));
    const trouble = (part: Array<string | null>) =>
      part.filter((level) => level === 'WARN' || level === 'ERROR').length;
    expect(trouble(levels.slice(100))).toBeGreaterThan(trouble(levels.slice(0, 100)));
    expect(levels.slice(150).filter((level) => level === 'ERROR').length).toBeGreaterThan(0);
  });

  it('is deterministic for a seed and different for another seed', () => {
    const first = createScenario({ kind: 'memoryLeak', seed: 5 });
    expect(createScenario({ kind: 'memoryLeak', seed: 5 })).toEqual(first);
    expect(createScenario({ kind: 'memoryLeak', seed: 6 })).not.toEqual(first);
  });

  it('never exceeds the cap, however many lines are asked for', () => {
    const lines = createScenario({ kind: 'paymentTimeouts', seed: 3, lineCount: 1_000_000 });
    expect(lines).toHaveLength(MAX_TAIL_LINES);
    expect(levelsOf(lines).filter((level) => level === 'FATAL')).toHaveLength(1);
  });

  it('still ends with a FATAL line when a tiny length is asked for', () => {
    const lines = createScenario({ kind: 'poolExhaustion', seed: 3, lineCount: -5 });
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(levelsOf(lines).pop()).toBe('FATAL');
  });

  it('writes lines the parser can read: time, level, service and trace id', () => {
    for (const line of createScenario({ kind: 'poolExhaustion', seed: 9 })) {
      const parsed = parseLine(line, 0);
      expect(parsed.timestamp).not.toBeNull();
      expect(parsed.level).not.toBeNull();
      expect(parsed.service).toMatch(/^[a-z-]+$/);
      expect(parsed.fields.trace_id).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it('moves time forward by 150 to 400 ms between lines', () => {
    const lines = createScenario({ kind: 'memoryLeak', seed: 8 });
    const times = lines.map((line) => parseLine(line, 0).timestamp ?? 0);
    for (let index = 1; index < times.length; index += 1) {
      const gap = times[index] - times[index - 1];
      expect(gap).toBeGreaterThanOrEqual(150);
      expect(gap).toBeLessThanOrEqual(400);
    }
  });

  it('starts at the requested time', () => {
    const start = Date.UTC(2030, 0, 2, 3, 4, 5);
    const [first] = createScenario({ kind: 'memoryLeak', seed: 1, startTimeMs: start });
    expect(parseLine(first, 0).timestamp).toBe(start);
  });
});

describe('clampLineCount', () => {
  it('uses the default when nothing is asked and keeps the value between the limits', () => {
    expect(clampLineCount(undefined)).toBe(DEFAULT_SCENARIO_LINES);
    expect(clampLineCount(50.7)).toBe(50);
    expect(clampLineCount(0)).toBeGreaterThan(1);
    expect(clampLineCount(99_999)).toBe(MAX_TAIL_LINES);
  });
});

describe('random helpers', () => {
  it('gives the same sequence for the same seed, in [0, 1)', () => {
    const first = createRandom(99);
    const second = createRandom(99);
    for (let step = 0; step < 50; step += 1) {
      const value = first();
      expect(value).toBe(second());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('waits between 150 and 400 ms', () => {
    const random = createRandom(4);
    for (let step = 0; step < 200; step += 1) {
      const delay = nextDelayMs(random);
      expect(delay).toBeGreaterThanOrEqual(150);
      expect(delay).toBeLessThanOrEqual(400);
    }
  });
});
