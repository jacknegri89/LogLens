import { describe, expect, it } from 'vitest';

import { decodeUrlWord, findUrlEncoded, parseQueryPairs, safeDecodePercent } from './urlEncoded';

describe('safeDecodePercent', () => {
  it('decodes valid escapes, including UTF-8 sequences', () => {
    expect(safeDecodePercent('a%20b%2Fc')).toBe('a b/c');
    expect(safeDecodePercent('caff%C3%A8')).toBe('caffè');
  });

  it('leaves a malformed escape as written instead of throwing', () => {
    expect(safeDecodePercent('bad%E9text')).toBe('bad%E9text');
    expect(safeDecodePercent('100%')).toBe('100%');
    expect(safeDecodePercent('%zz%20ok')).toBe('%zz ok');
  });
});

describe('parseQueryPairs', () => {
  it('decodes keys and values and treats + as a space', () => {
    expect(parseQueryPairs('q=hello+world&tag=a%26b')).toEqual([
      ['q', 'hello world'],
      ['tag', 'a&b'],
    ]);
  });

  it('skips parts without a key', () => {
    expect(parseQueryPairs('&=x&flag&k=v')).toEqual([['k', 'v']]);
  });
});

describe('decodeUrlWord', () => {
  it('lists the pairs of a query string', () => {
    const details = decodeUrlWord('/search?q=caf%C3%A9&page=2');
    expect(details?.pairs).toEqual([
      ['q', 'café'],
      ['page', '2'],
    ]);
  });

  it('returns null when nothing is encoded', () => {
    expect(decodeUrlWord('/search?q=plain')).toBeNull();
  });
});

describe('findUrlEncoded', () => {
  it('marks only the value of a key=value pair', () => {
    const line = 'redirect=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1 status=302';
    const [token] = findUrlEncoded(line);
    expect(token.source).toBe('https%3A%2F%2Fexample.com%2Fa%3Fb%3D1');
    expect(token.details).toMatchObject({ text: 'https://example.com/a?b=1' });
  });

  it('drops trailing punctuation from the token', () => {
    const [token] = findUrlEncoded('failed for name%20x.');
    expect(token.source).toBe('name%20x');
  });

  it('ignores a percent sign that is not an escape', () => {
    expect(findUrlEncoded('disk usage 91% on node 7')).toEqual([]);
    expect(findUrlEncoded('format %s failed')).toEqual([]);
  });
});
