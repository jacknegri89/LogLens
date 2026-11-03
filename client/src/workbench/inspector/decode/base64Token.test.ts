import { describe, expect, it } from 'vitest';

import { decodeBase64Candidate, findBase64 } from './base64Token';
import { toBase64Url } from './testTokens';

describe('decodeBase64Candidate', () => {
  it('decodes readable text', () => {
    const encoded = btoa('user=alice role=admin');
    expect(decodeBase64Candidate(encoded)?.text).toBe('user=alice role=admin');
  });

  it('pretty-prints decoded JSON', () => {
    const decoded = decodeBase64Candidate(btoa('{"order":42,"items":["a","b"]}'));
    expect(decoded?.json).toContain('\n  "order": 42');
  });

  it('decodes the url-safe alphabet without padding', () => {
    expect(decodeBase64Candidate(toBase64Url('Hello, Workbench?>>'))?.text).toBe(
      'Hello, Workbench?>>',
    );
  });

  it('rejects hex ids, UUIDs and plain words', () => {
    expect(decodeBase64Candidate('9f86d081884c7d659a2feaa0c55ad015')).toBeNull();
    expect(decodeBase64Candidate('123e4567-e89b-12d3-a456-426614174000')).toBeNull();
    expect(decodeBase64Candidate('internationalization')).toBeNull();
    expect(decodeBase64Candidate('ConnectionRefusedException')).toBeNull();
    expect(decodeBase64Candidate('InternalServerErrorHandler')).toBeNull();
  });

  it('rejects base64 of binary data', () => {
    const binary = String.fromCharCode(0, 255, 3, 200, 17, 250, 9, 1, 2, 3, 128, 129);
    expect(decodeBase64Candidate(btoa(binary))).toBeNull();
  });

  it('rejects a length no base64 text can have', () => {
    expect(decodeBase64Candidate('QUJDREVGR0hJSktMTU5PUAQ')).toBeNull();
  });
});

describe('findBase64', () => {
  it('finds a token in a line with its position', () => {
    const encoded = btoa('payload from the client');
    const line = `body=${encoded} received`;
    const [token] = findBase64(line);
    expect(line.slice(token.start, token.end)).toBe(encoded);
  });

  it('skips short strings and ordinary log text', () => {
    expect(findBase64('GET /api/v1/users/profile/settings 200 12ms')).toEqual([]);
    expect(findBase64('request id 4f2a9c1e7b3d4a5e8c6f1b2a3d4e5f60 ok')).toEqual([]);
    expect(findBase64('QUJD')).toEqual([]);
  });
});
