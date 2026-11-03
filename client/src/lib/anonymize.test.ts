import { describe, expect, it } from 'vitest';

import { anonymizeLog } from './anonymize';

function anonymized(text: string): string {
  return anonymizeLog(text).text;
}

describe('IP addresses', () => {
  it('numbers IPv4 addresses by first appearance and keeps ports', () => {
    const result = anonymizeLog('connect 10.0.2.15:5432 refused, retry from 192.168.1.9');
    expect(result.text).toBe('connect IP-1:5432 refused, retry from IP-2');
    expect(result.replaced).toEqual({ IP: 2 });
  });

  it('replaces IPv6 addresses, bracketed ones included', () => {
    expect(anonymized('peer 2001:db8::1 and [fe80::a00:27ff:fe4e:66a1]:443')).toBe(
      'peer IP-1 and [IP-2]:443',
    );
    expect(anonymized('loopback ::1 and 2001:0db8:0000:0000:0000:ff00:0042:8329')).toBe(
      'loopback IP-1 and IP-2',
    );
  });

  it('gives the same token to the same address', () => {
    expect(anonymized('a 1.2.3.4 b 5.6.7.8 c 1.2.3.4')).toBe('a IP-1 b IP-2 c IP-1');
  });
});

describe('e-mail addresses', () => {
  it('replaces addresses and ignores case when matching repeats', () => {
    const result = anonymizeLog(
      'mail Ana.Rossi@example.com, then ana.rossi@EXAMPLE.com, bob@corp.io',
    );
    expect(result.text).toBe('mail EMAIL-1, then EMAIL-1, EMAIL-2');
    expect(result.replaced).toEqual({ EMAIL: 2 });
  });
});

describe('secrets', () => {
  it('keeps the key name and replaces the value', () => {
    const result = anonymizeLog('password=hunter2 api_key=AKxyz123 secret: s3cr3t token=abc.def');
    expect(result.text).toBe('password=SECRET-1 api_key=SECRET-2 secret: SECRET-3 token=SECRET-4');
  });

  it('handles JSON and URL query values', () => {
    expect(anonymized('{"password": "hunter2", "ok": true}')).toBe(
      '{"password": "SECRET-1", "ok": true}',
    );
    expect(anonymized('GET /cb?access_token=abc123&state=ok')).toBe(
      'GET /cb?access_token=SECRET-1&state=ok',
    );
  });

  it('replaces Bearer values and JWT-like tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.c2lnbmF0dXJl';
    expect(anonymized(`Authorization: Bearer abc123XYZ789`)).toBe('Authorization: Bearer SECRET-1');
    expect(anonymized(`jwt ${jwt} seen, again ${jwt}`)).toBe('jwt SECRET-1 seen, again SECRET-1');
  });

  it('replaces long hex and base64 strings', () => {
    const hex = 'a3f5c9d1e7b24680a3f5c9d1e7b24680aa';
    const base64 = 'Qk9vdGlOZ1NlY3JldFZhbHVlMTIzNDU2Nzg5MEFi';
    expect(anonymized(`sha ${hex}`)).toBe('sha SECRET-1');
    expect(anonymized(`blob ${base64}`)).toBe('blob SECRET-1');
  });

  it('shares one token between a keyed value and the same bare value', () => {
    const hex = 'a3f5c9d1e7b24680a3f5c9d1e7b24680';
    expect(anonymized(`token=${hex} later ${hex}`)).toBe('token=SECRET-1 later SECRET-1');
  });
});

describe('user names', () => {
  it('replaces the user in the common sshd and key=value forms', () => {
    const log = [
      'Failed password for root from 10.0.0.5 port 22 ssh2',
      'Failed password for invalid user admin from 10.0.0.5',
      'login ok user=maria, session 4',
      'Authentication failure for user maria.',
    ].join('\n');
    expect(anonymized(log)).toBe(
      [
        'Failed password for USER-1 from IP-1 port 22 ssh2',
        'Failed password for invalid user USER-2 from IP-1',
        'login ok user=USER-3, session 4',
        'Authentication failure for user USER-3.',
      ].join('\n'),
    );
  });
});

describe('text that must stay untouched', () => {
  it.each([
    '2026-11-03T10:20:30.123Z ERROR worker crashed',
    'Nov  3 10:20:30 host sshd[812]: pam_unix(sshd:auth): authentication failure',
    'GET /api/users/42?page=2 HTTP/1.1 500 1234',
    'listening on port 8080 and 5432, exit code 137',
    'java.lang.NullPointerException at com.example.UserService.load(UserService.java:88)',
    'ECONNREFUSED connect failed, timeout after 30s, out of memory',
    'lodash@4.17.21 requires node 18.19.0 and pkg@1.2.3',
    'Invalid Bearer token, password expired, token expired',
    'PWD=/home/app uses std::vector and Foo::bar',
    '550e8400-e29b-41d4-a716-446655440000 request id',
    'see /var/log/some/very/long/path/to/the/application/service.log',
    'a_very_long_snake_case_identifier_that_is_not_a_secret_at_all',
  ])('leaves "%s" as it is', (line) => {
    const result = anonymizeLog(line);
    expect(result.text).toBe(line);
    expect(result.replaced).toEqual({});
  });
});

describe('result shape', () => {
  it('counts different values per kind, not occurrences', () => {
    const result = anonymizeLog('1.1.1.1 1.1.1.1 2.2.2.2 a@b.co password=x');
    expect(result.replaced).toEqual({ IP: 2, EMAIL: 1, SECRET: 1 });
  });

  it('keeps the number of lines', () => {
    const log = 'a 1.2.3.4\nb token=zzz\n\nc user=bob';
    expect(anonymized(log).split('\n')).toHaveLength(4);
  });
});
