import { describe, expect, it } from 'vitest';

import { parseLine } from '../../core/basicParse';
import { findLineTokens, findTokens, MAX_SCANNED_LENGTH, splitSegments } from './findTokens';
import { makeJwt } from './testTokens';

describe('findTokens', () => {
  it('finds mixed tokens in reading order', () => {
    const token = makeJwt({ alg: 'HS256' }, { sub: 'a' });
    const line = `ts=1700000000 auth=${token} next=%2Fhome%2Fuser`;
    expect(findTokens(line).map((found) => found.kind)).toEqual(['epoch', 'jwt', 'urlencoded']);
  });

  it('never returns two tokens over the same characters', () => {
    const token = makeJwt({ alg: 'HS256' }, { sub: 'a', exp: 1_700_000_000 });
    const tokens = findTokens(`Bearer ${token}`);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe('jwt');
  });

  it('finds nothing in an ordinary line', () => {
    expect(findTokens('INFO server started on port 8080 in 35ms')).toEqual([]);
    expect(findTokens('')).toEqual([]);
  });

  it('stays fast and bounded on a huge line', () => {
    const huge = 'a1B2 '.repeat(100_000);
    const started = performance.now();
    findTokens(huge);
    expect(performance.now() - started).toBeLessThan(1000);
    expect(findTokens('x'.repeat(MAX_SCANNED_LENGTH) + ' ts=1700000000')).toEqual([]);
  });
});

describe('findLineTokens', () => {
  it('adds tokens that only a parsed field value shows', () => {
    const line = parseLine('{"msg":"ok","next":"a\\u0025\\u0032\\u0030b"}', 0);
    expect(line.fields.next).toBe('a%20b');
    const tokens = findLineTokens(line);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].start).toBe(-1);
  });

  it('does not repeat a token already found in the raw line', () => {
    expect(findLineTokens(parseLine('exp=1700000000', 0))).toHaveLength(1);
  });
});

describe('splitSegments', () => {
  it('cuts the text around tokens and rebuilds it exactly', () => {
    const text = 'at 1700000000 and 1700000100 done';
    const segments = splitSegments(text, findTokens(text));
    expect(segments.map((segment) => segment.text).join('')).toBe(text);
    expect(segments.filter((segment) => segment.token)).toHaveLength(2);
  });

  it('returns the whole text when there are no tokens', () => {
    expect(splitSegments('plain', [])).toEqual([{ text: 'plain', token: null }]);
    expect(splitSegments('', [])).toEqual([]);
  });

  it('skips field tokens that have no place in the text', () => {
    const line = parseLine('{"next":"a\\u0025\\u0032\\u0030b"}', 0);
    const segments = splitSegments(line.raw, findLineTokens(line));
    expect(segments.every((segment) => segment.token === null)).toBe(true);
  });
});
