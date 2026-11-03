import { describe, expect, it } from 'vitest';

import { findClosingIndex, findJsonSegments, prettyPrint } from './embeddedJson';

describe('findClosingIndex', () => {
  it('matches nested brackets', () => {
    const text = 'x {"a":[1,{"b":2}]} y';
    expect(text.slice(2, findClosingIndex(text, 2))).toBe('{"a":[1,{"b":2}]}');
  });

  it('ignores brackets and quotes inside strings', () => {
    const text = '{"msg":"a } and \\" ] here"} tail';
    expect(text.slice(0, findClosingIndex(text, 0))).toBe('{"msg":"a } and \\" ] here"}');
  });

  it('returns -1 for unbalanced or mismatched brackets', () => {
    expect(findClosingIndex('{"a":1', 0)).toBe(-1);
    expect(findClosingIndex('{"a":[1}', 0)).toBe(-1);
    expect(findClosingIndex('{"a":"unterminated}', 0)).toBe(-1);
  });
});

describe('findJsonSegments', () => {
  it('finds an object embedded in a message', () => {
    const line = 'ERROR payment failed payload={"order":12,"items":[{"sku":"a"}]} retrying';
    const [segment] = findJsonSegments(line);
    expect(line.slice(segment.start, segment.end)).toBe('{"order":12,"items":[{"sku":"a"}]}');
    expect(segment.value).toEqual({ order: 12, items: [{ sku: 'a' }] });
  });

  it('treats a whole JSON line as one segment', () => {
    const [segment] = findJsonSegments('{"level":"error","msg":"boom"}');
    expect(segment.start).toBe(0);
  });

  it('finds several separate segments and does not look inside the first', () => {
    const segments = findJsonSegments('a {"x":{"y":1}} b [1,2,3] c');
    expect(segments.map((segment) => segment.value)).toEqual([{ x: { y: 1 } }, [1, 2, 3]]);
  });

  it('ignores log brackets that are not JSON', () => {
    expect(findJsonSegments('[INFO] [main] started [7] {}')).toEqual([]);
    expect(findJsonSegments('plain text with { braces')).toEqual([]);
    expect(findJsonSegments('{not json}')).toEqual([]);
  });

  it('skips a broken object and still finds the valid one after it', () => {
    const segments = findJsonSegments('{broken: 1} then {"ok":true}');
    expect(segments).toHaveLength(1);
    expect(segments[0].value).toEqual({ ok: true });
  });

  it('stays fast when the line is full of opening braces', () => {
    const started = performance.now();
    expect(findJsonSegments('{'.repeat(100_000))).toEqual([]);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe('prettyPrint', () => {
  it('indents with two spaces', () => {
    expect(prettyPrint({ a: [1] })).toBe('{\n  "a": [\n    1\n  ]\n}');
  });
});
