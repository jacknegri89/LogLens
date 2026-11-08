import { describe, expect, it } from 'vitest';

import { parseLines } from '../../core/basicParse';
import { filterLines } from '../query/matchQuery';
import { parseQuery } from '../query/parseQuery';
import { faultFocusMarks } from './faultFocus';
import {
  MAX_RENDERED_ROWS,
  findSorted,
  nextRow,
  rowOfLine,
  scrollTopToReveal,
  visibleWindow,
} from './visibleWindow';

describe('faultFocusMarks', () => {
  it('keeps faults and the trace lines that follow them, not the next timed line', () => {
    const lines = parseLines(
      [
        '2026-11-03T09:00:00Z INFO boot',
        '2026-11-03T09:00:01Z ERROR crash',
        'Traceback (most recent call last):',
        '    await handler()',
        'redis.exceptions.BusyLoadingError: loading',
        '2026-11-03T09:00:02Z INFO recovered',
        '    orphan detail',
      ].join('\n'),
    );
    expect(Array.from(faultFocusMarks(lines))).toEqual([0, 1, 1, 1, 1, 0, 0]);
  });

  it('handles an empty log', () => {
    expect(faultFocusMarks([]).length).toBe(0);
  });
});

describe('visibleWindow', () => {
  it('renders the visible rows plus overscan at the top', () => {
    const window = visibleWindow(0, 280, 1000, 28);
    expect(window.start).toBe(0);
    expect(window.end).toBe(27);
    expect(window.totalHeight).toBe(28_000);
  });

  it('never renders more than the cap, whatever the scroll or viewport', () => {
    for (const scrollTop of [0, 1234, 999_999, 1e9, -50, Number.NaN]) {
      for (const height of [0, 300, 900, 20_000]) {
        const window = visibleWindow(scrollTop, height, 50_000);
        expect(window.end - window.start).toBeLessThanOrEqual(MAX_RENDERED_ROWS);
        expect(window.start).toBeGreaterThanOrEqual(0);
        expect(window.end).toBeLessThanOrEqual(50_000);
      }
    }
  });

  it('keeps the last rows visible when scrolled past the end', () => {
    const window = visibleWindow(1e9, 280, 100, 28);
    expect(window.end).toBe(100);
    expect(window.offsetTop).toBe(window.start * 28);
  });

  it('gives nothing for an empty list', () => {
    expect(visibleWindow(0, 500, 0)).toEqual({ start: 0, end: 0, offsetTop: 0, totalHeight: 0 });
  });
});

describe('scrollTopToReveal', () => {
  it('scrolls up or down only when the row is hidden', () => {
    expect(scrollTopToReveal(5, 280, 280, 28)).toBe(140);
    expect(scrollTopToReveal(30, 0, 280, 28)).toBe(588);
    expect(scrollTopToReveal(3, 0, 280, 28)).toBeNull();
  });
});

describe('nextRow', () => {
  it('moves by one, by a page and to the ends, clamped', () => {
    expect(nextRow('ArrowDown', 4, 10, 3)).toBe(5);
    expect(nextRow('ArrowUp', 0, 10, 3)).toBe(0);
    expect(nextRow('PageDown', 8, 10, 3)).toBe(9);
    expect(nextRow('PageUp', 2, 10, 3)).toBe(0);
    expect(nextRow('Home', 7, 10, 3)).toBe(0);
    expect(nextRow('End', 0, 10, 3)).toBe(9);
  });

  it('starts at the top when nothing is active and ignores other keys', () => {
    expect(nextRow('ArrowDown', -1, 10, 3)).toBe(0);
    expect(nextRow('a', 2, 10, 3)).toBeNull();
    expect(nextRow('ArrowDown', 0, 0, 3)).toBeNull();
  });
});

describe('findSorted', () => {
  it('finds a value or says -1', () => {
    expect(findSorted([1, 4, 9, 12], 9)).toBe(2);
    expect(findSorted([1, 4, 9, 12], 5)).toBe(-1);
    expect(findSorted([], 5)).toBe(-1);
  });

  it('finds the row of a line through its original index', () => {
    const lines = [{ index: 0 }, { index: 2 }, { index: 5 }, { index: 9 }];
    expect(rowOfLine(lines, [0, 2, 3], 5)).toBe(1);
    expect(rowOfLine(lines, [0, 3], 5)).toBe(-1);
    expect(rowOfLine(lines, [0, 1, 2, 3], 4)).toBe(-1);
  });
});

describe('50,000 lines', () => {
  it('parses, filters and windows within the time budget', () => {
    const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
    const text = Array.from({ length: 50_000 }, (_, index) => {
      let status = 503;
      if (index % 2) {
        status = 200;
      }
      return `2026-11-03T09:${String(Math.floor(index / 1000) % 60).padStart(2, '0')}:00.${String(index % 1000).padStart(3, '0')}Z ${levels[index % 4]} [svc-${index % 7}] request done status=${status} latency=${index % 400}ms trace_id=t${index}`;
    }).join('\n');

    const started = performance.now();
    const lines = parseLines(text);
    const matches = filterLines(lines, parseQuery('level:ERROR status:5* latency:>200 -svc-3'));
    const focus = faultFocusMarks(lines);
    const elapsed = performance.now() - started;

    expect(lines).toHaveLength(50_000);
    expect(matches.length).toBeGreaterThan(0);
    expect(focus.length).toBe(50_000);
    expect(elapsed).toBeLessThan(3000);
    const window = visibleWindow(matches.length * 14, 800, matches.length);
    expect(window.end - window.start).toBeLessThanOrEqual(MAX_RENDERED_ROWS);
  });
});
