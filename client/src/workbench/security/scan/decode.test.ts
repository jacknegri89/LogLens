import { describe, expect, it } from 'vitest';

import { decodeForMatching, requestTarget } from './decode';

describe('decodeForMatching', () => {
  it('decodes percent escapes, also when they are encoded twice', () => {
    expect(decodeForMatching('%3Cscript%3E')).toBe('<script>');
    expect(decodeForMatching('%252e%252e%252fetc')).toBe('../etc');
  });

  it('reads plus as a space and lower-cases', () => {
    expect(decodeForMatching('UNION+SELECT')).toBe('union select');
  });

  it('turns SQL comments into spaces', () => {
    expect(decodeForMatching('union/**/select')).toBe('union select');
  });

  it('survives broken escapes', () => {
    expect(decodeForMatching('100%zz and %2')).toBe('100%zz and %2');
  });

  it('looks only at the start of a huge line', () => {
    const decoded = decodeForMatching(`${'a'.repeat(30_000)}b`);
    expect(decoded.length).toBe(20_000);
  });
});

describe('requestTarget', () => {
  it('reads the target of an access line, decoded', () => {
    const raw = '1.2.3.4 - - [03/Nov/2026:10:00:00 +0000] "GET /a%2e%2e/b?q=1 HTTP/1.1" 200 12';
    expect(requestTarget(raw, {})).toBe('/a../b?q=1');
  });

  it('falls back to a path field', () => {
    expect(requestTarget('msg', { path: '/.ENV' })).toBe('/.env');
    expect(requestTarget('msg', { request: 'POST /login' })).toBe('/login');
  });

  it('is null when the line is not a web request', () => {
    expect(requestTarget('ERROR database timeout after 30s', {})).toBeNull();
  });
});
