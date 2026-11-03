import { describe, expect, it } from 'vitest';

import { EXTRACTORS, findExtractor, maskSecret, type ExtractorId } from './extractors';
import { buildRegex, DEFAULT_FLAGS } from './regexBuild';
import { findRanges } from './regexScan';

function extract(id: ExtractorId, text: string): string[] {
  const extractor = findExtractor(id);
  const regex = new RegExp(extractor.pattern, `g${extractor.flags}`);
  return findRanges(text, regex, false, 100).map((range) => text.slice(range.start, range.end));
}

describe('extractors', () => {
  it('finds IPv4 addresses and ignores out-of-range octets and plain numbers', () => {
    expect(extract('ipv4', 'from 10.0.2.15:5432 to 192.168.1.1')).toEqual([
      '10.0.2.15',
      '192.168.1.1',
    ]);
    expect(extract('ipv4', 'bad 999.1.1.1 and 300.2.3.4 and version 1.2.3')).toEqual([]);
  });

  it('finds UUIDs in any case and ignores near misses', () => {
    const id = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    expect(extract('uuid', `order ${id} and ${id.toUpperCase()}`)).toEqual([id, id.toUpperCase()]);
    expect(extract('uuid', 'id 3f2504e0-4f89-41d3-9a0c-0305e82c33 is short')).toEqual([]);
  });

  it('finds JWTs, bearer tokens, Stripe keys and AWS key ids', () => {
    const jwt = 'eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2QT4';
    const text = `jwt=${jwt} Authorization: Bearer abc123def456 key sk_live_abcdef123456 aws AKIAIOSFODNN7EXAMPLE`;
    expect(extract('secrets', text)).toEqual([
      jwt,
      'Bearer abc123def456',
      'sk_live_abcdef123456',
      'AKIAIOSFODNN7EXAMPLE',
    ]);
    expect(extract('secrets', 'sk_test_abcdefgh')).toEqual(['sk_test_abcdefgh']);
  });

  it('ignores text that only looks like a secret', () => {
    expect(extract('secrets', 'Bearer x, AKIA123, sk_live_, eyJabc.def')).toEqual([]);
  });

  it('finds JavaScript and Python stack frames', () => {
    const text = [
      '    at handler (/srv/app/index.js:42:13)',
      '    at /srv/app/server.js:7:1',
      '  File "/app/main.py", line 18, in run',
    ].join('\n');
    expect(extract('stackFrames', text)).toEqual([
      'at handler (/srv/app/index.js:42:13)',
      'at /srv/app/server.js:7:1',
      'File "/app/main.py", line 18',
    ]);
    expect(extract('stackFrames', 'we arrived at the station at 10:30')).toEqual([]);
  });

  it('finds latencies with and without a space and decimals', () => {
    expect(extract('latencies', 'took 1840ms then 12.5 ms and 3 ms')).toEqual([
      '1840ms',
      '12.5 ms',
      '3 ms',
    ]);
    expect(extract('latencies', 'items: 12, 5 msgs, 3 millis')).toEqual([]);
  });

  it('builds every extractor into a usable regex that is not flagged as risky', () => {
    for (const extractor of EXTRACTORS) {
      expect(buildRegex(extractor.pattern, DEFAULT_FLAGS).status, extractor.id).toBe('ready');
    }
  });
});

describe('maskSecret', () => {
  it('keeps the start and hides the rest', () => {
    expect(maskSecret('sk_live_abcdef123456')).toBe('sk_liv••••');
  });

  it('keeps the word Bearer and masks the token after it', () => {
    expect(maskSecret('Bearer abcdef123456789')).toBe('Bearer abcdef••••');
  });

  it('hides a short value entirely', () => {
    expect(maskSecret('abc')).toBe('••••');
  });
});
