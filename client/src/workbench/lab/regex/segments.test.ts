import { describe, expect, it } from 'vitest';

import { splitSegments } from './segments';

describe('splitSegments', () => {
  it('splits a line around its matches', () => {
    expect(splitSegments('GET /a 500', [{ start: 7, end: 10 }])).toEqual([
      { text: 'GET /a ', matched: false },
      { text: '500', matched: true },
    ]);
  });

  it('handles adjacent matches without empty pieces', () => {
    const segments = splitSegments('abcd', [
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
    expect(segments).toEqual([
      { text: 'ab', matched: true },
      { text: 'cd', matched: true },
    ]);
  });

  it('returns the whole text when nothing matched', () => {
    expect(splitSegments('quiet', [])).toEqual([{ text: 'quiet', matched: false }]);
  });

  it('ignores empty ranges and ranges past the end', () => {
    const ranges = [
      { start: 1, end: 1 },
      { start: 5, end: 9 },
    ];
    expect(splitSegments('abc', ranges)).toEqual([{ text: 'abc', matched: false }]);
  });

  it('keeps markup characters as plain text', () => {
    const segments = splitSegments('<b>x</b>', [{ start: 0, end: 3 }]);
    expect(segments[0]).toEqual({ text: '<b>', matched: true });
  });
});
