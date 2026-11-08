import { describe, expect, it } from 'vitest';

import { logHash, parseLogHash, splitLogAroundRange } from './logFocus';

describe('logHash and parseLogHash', () => {
  it('writes and reads one line or a range of lines', () => {
    expect(logHash(12)).toBe('#log-12');
    expect(logHash(12, 15)).toBe('#log-12-15');
    expect(parseLogHash('#log-12')).toEqual({ start: 12, end: 12 });
    expect(parseLogHash('#log-12-15')).toEqual({ start: 12, end: 15 });
  });

  it('ignores a hash that points at something else', () => {
    expect(parseLogHash('')).toBeNull();
    expect(parseLogHash('#top')).toBeNull();
    expect(parseLogHash('#log-0')).toBeNull();
    expect(parseLogHash('#log-abc')).toBeNull();
    expect(parseLogHash('#log-12-')).toBeNull();
  });

  it('never reads a range that ends before it starts', () => {
    expect(parseLogHash('#log-9-3')).toEqual({ start: 9, end: 9 });
  });
});

describe('splitLogAroundRange', () => {
  const log = ['one', 'two', 'three', 'four', 'five'].join('\n');

  it('cuts the log into the lines before, the highlighted lines and the lines after', () => {
    const parts = splitLogAroundRange(log, { start: 2, end: 3 });
    expect(parts.before).toBe('one\n');
    expect(parts.focus).toBe('two\nthree');
    expect(parts.after).toBe('\nfour\nfive');
    expect(parts.before + parts.focus + parts.after).toBe(log);
  });

  it('handles the first line, the last line and a range cut by the end of the log', () => {
    expect(splitLogAroundRange(log, { start: 1, end: 1 })).toEqual({
      before: '',
      focus: 'one',
      after: '\ntwo\nthree\nfour\nfive',
    });
    expect(splitLogAroundRange(log, { start: 5, end: 9 })).toEqual({
      before: 'one\ntwo\nthree\nfour\n',
      focus: 'five',
      after: '',
    });
  });

  it('highlights nothing when the range is past the end', () => {
    expect(splitLogAroundRange(log, { start: 40, end: 41 })).toEqual({
      before: log,
      focus: '',
      after: '',
    });
  });
});
