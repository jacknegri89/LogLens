import { describe, expect, it } from 'vitest';

import { computeLineDiff, toSideBySideRows, toUnifiedText } from './diff';

describe('computeLineDiff', () => {
  it('marks every line of identical texts as same', () => {
    const diff = computeLineDiff('a\nb', 'a\nb');
    expect(diff).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'same', text: 'b' },
    ]);
  });

  it('finds the removed and the added line of a replacement', () => {
    const diff = computeLineDiff('a\nold\nc', 'a\nnew\nc');
    expect(diff.map((line) => `${line.kind}:${line.text}`)).toEqual([
      'same:a',
      'removed:old',
      'added:new',
      'same:c',
    ]);
  });

  it('handles an insertion in the middle without touching the other lines', () => {
    const diff = computeLineDiff('a\nc', 'a\nb\nc');
    expect(diff.filter((line) => line.kind !== 'same')).toEqual([{ kind: 'added', text: 'b' }]);
  });

  it('treats an empty before as all added and an empty after as all removed', () => {
    expect(computeLineDiff('', 'x\ny').map((line) => line.kind)).toEqual(['added', 'added']);
    expect(computeLineDiff('x\ny', '').map((line) => line.kind)).toEqual(['removed', 'removed']);
  });

  it('returns nothing for two empty texts', () => {
    expect(computeLineDiff('', '')).toEqual([]);
  });

  it('keeps the original lines in order when the texts share nothing', () => {
    const diff = computeLineDiff('a\nb', 'x\ny');
    expect(diff.filter((line) => line.kind === 'removed').map((line) => line.text)).toEqual([
      'a',
      'b',
    ]);
    expect(diff.filter((line) => line.kind === 'added').map((line) => line.text)).toEqual([
      'x',
      'y',
    ]);
  });
});

describe('toUnifiedText', () => {
  it('prefixes every line with a space, a minus or a plus after a header', () => {
    const text = toUnifiedText(computeLineDiff('a\nold', 'a\nnew'));
    expect(text).toBe('--- before\n+++ after\n a\n-old\n+new');
  });

  it('rebuilds the after text from the lines that are not removed', () => {
    const after = 'x\nnew\nz';
    const diff = computeLineDiff('x\nold\nz', after);
    const rebuilt = diff.filter((line) => line.kind !== 'removed').map((line) => line.text);
    expect(rebuilt.join('\n')).toBe(after);
  });
});

describe('toSideBySideRows', () => {
  it('pairs a removed line with the added line that replaces it', () => {
    const rows = toSideBySideRows(computeLineDiff('a\nold\nc', 'a\nnew\nc'));
    expect(rows).toHaveLength(3);
    expect(rows[1].left?.text).toBe('old');
    expect(rows[1].right?.text).toBe('new');
  });

  it('leaves the empty side null when one block is longer', () => {
    const rows = toSideBySideRows(computeLineDiff('a', 'a\nb\nc'));
    expect(rows.map((row) => row.left?.text ?? null)).toEqual(['a', null, null]);
    expect(rows.map((row) => row.right?.text ?? null)).toEqual(['a', 'b', 'c']);
  });
});
