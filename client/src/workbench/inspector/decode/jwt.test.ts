import { describe, expect, it } from 'vitest';

import { decodeJwt, findJwts, isExpired } from './jwt';
import { makeJwt, toBase64Url } from './testTokens';

describe('decodeJwt', () => {
  it('reads the header, the payload and the time claims', () => {
    const token = makeJwt(
      { alg: 'HS256', typ: 'JWT' },
      { sub: 'u1', exp: 1_700_000_000, iat: 1_699_990_000 },
    );
    const details = decodeJwt(token);
    expect(details?.algorithm).toBe('HS256');
    expect(JSON.parse(details?.payloadJson ?? '{}')).toMatchObject({ sub: 'u1' });
    expect(details?.expiresAtMilliseconds).toBe(1_700_000_000_000);
    expect(details?.claims.map((claim) => claim.name)).toEqual(['exp', 'iat']);
  });

  it('accepts an empty signature (alg none)', () => {
    expect(decodeJwt(makeJwt({ alg: 'none' }, { a: 1 }, ''))?.algorithm).toBe('none');
  });

  it('keeps a token whose payload is not JSON but reports no payload', () => {
    const token = `${toBase64Url('{"alg":"RS256"}')}.${toBase64Url('plain words')}.c2ln`;
    expect(decodeJwt(token)?.payloadJson).toBeNull();
  });

  it('ignores time claims that are not plausible numbers', () => {
    const details = decodeJwt(makeJwt({ alg: 'HS256' }, { exp: 'soon', nbf: -5, iat: 9e15 }));
    expect(details?.claims).toEqual([]);
    expect(details?.expiresAtMilliseconds).toBeNull();
  });

  it('rejects a first part that is not a JSON header with alg', () => {
    expect(decodeJwt(makeJwt({ typ: 'JWT' }, { a: 1 }))).toBeNull();
    expect(decodeJwt(`${toBase64Url('["alg"]')}.${toBase64Url('{}')}.sig`)).toBeNull();
    expect(decodeJwt('not.a.jwt')).toBeNull();
    expect(decodeJwt('!!!!!!!!.@@@.###')).toBeNull();
  });
});

describe('isExpired', () => {
  it('compares the expiry with the given time', () => {
    expect(isExpired(1000, 2000)).toBe(true);
    expect(isExpired(3000, 2000)).toBe(false);
  });
});

describe('findJwts', () => {
  it('finds a token inside a header line and gives its position', () => {
    const token = makeJwt({ alg: 'HS256' }, { sub: 'a' });
    const line = `auth header Bearer ${token} rejected`;
    const [found] = findJwts(line);
    expect(found.source).toBe(token);
    expect(line.slice(found.start, found.end)).toBe(token);
  });

  it('does not take version numbers, hostnames or class names for tokens', () => {
    expect(findJwts('version 1.22.3 on api.service.internal at com.acme.pay.Handler')).toEqual([]);
    expect(findJwts('2024-01-15.10.30 files.zip.backup')).toEqual([]);
  });
});
