import { describe, expect, it } from 'vitest';

import { fingerprint } from './fingerprint';

describe('fingerprint: lines that differ only by variable parts share a template', () => {
  it('ignores numbers, durations and ids in a path', () => {
    expect(fingerprint('GET /users/123/orders took 45ms')).toBe(
      fingerprint('GET /users/98765/orders took 1200ms'),
    );
  });

  it('ignores UUIDs and long hex ids', () => {
    expect(fingerprint('job 123e4567-e89b-12d3-a456-426614174000 failed')).toBe(
      fingerprint('job 9b2c1d3e-1111-4222-8333-944455556666 failed'),
    );
    expect(fingerprint('cache miss for 9f86d081884c7d65')).toBe(
      fingerprint('cache miss for 5994471abb01112a'),
    );
    expect(fingerprint('cache miss for 9f86d081884c7d65')).toContain('<hex>');
  });

  it('ignores IPv4, IPv6 and ports', () => {
    expect(fingerprint('connect to 10.0.2.15:5432 refused')).toBe(
      fingerprint('connect to 192.168.1.20:6379 refused'),
    );
    expect(fingerprint('peer 2001:db8::1 reset')).toBe(fingerprint('peer fe80::a1b2 reset'));
  });

  it('ignores times, emails and quoted values', () => {
    expect(fingerprint('login by ann@example.com at 10:15:02')).toBe(
      fingerprint('login by bob.smith@corp.io at 23:59:59.120'),
    );
    expect(fingerprint('user "Ann Lee" not found')).toBe(fingerprint('user "Bob" not found'));
    expect(fingerprint("missing key 'alpha'")).toBe(fingerprint("missing key 'beta'"));
  });

  it('ignores the value of noisy key=value pairs only', () => {
    expect(fingerprint('done user=alice request_id=abc-xyz status=ok')).toBe(
      fingerprint('done user=bob request_id=qqq-111 status=ok'),
    );
    expect(fingerprint('done status=ok')).not.toBe(fingerprint('done status=failed'));
  });
});

describe('fingerprint: different messages stay apart', () => {
  it('keeps different words in different templates', () => {
    expect(fingerprint('Connection refused by host')).not.toBe(
      fingerprint('Connection timed out by host'),
    );
  });

  it('keeps words that merely contain digits', () => {
    expect(fingerprint('utf8 decoding failed')).not.toBe(fingerprint('utf16 decoding failed'));
  });

  it('keeps plain words that look like hex letters', () => {
    expect(fingerprint('effaced record')).toBe('effaced record');
  });

  it('keeps the JSON keys but not the values', () => {
    expect(fingerprint('{"event":"login","user":"a"}')).toBe(
      fingerprint('{"event":"login","user":"b"}'),
    );
    expect(fingerprint('{"event":"login"}')).not.toBe(fingerprint('{"action":"login"}'));
  });
});

describe('fingerprint: edge cases', () => {
  it('handles an empty message', () => {
    expect(fingerprint('')).toBe('');
  });

  it('collapses whitespace and caps very long templates', () => {
    expect(fingerprint('a   b \t c')).toBe('a b c');
    expect(fingerprint('word '.repeat(500)).length).toBeLessThanOrEqual(300);
  });
});
