import { describe, expect, it } from 'vitest';

import { parseLines } from '../../core/basicParse';
import { eventTime, findBruteForce, isFailedLogin } from './bruteForce';
import { parseLine } from '../../core/basicParse';

function sshFailure(second: number, address = '203.0.113.9'): string {
  const clock = `2026-11-03T10:${String(Math.floor(second / 60)).padStart(2, '0')}:${String(second % 60).padStart(2, '0')}Z`;
  return `${clock} sshd[812]: Failed password for root from ${address} port 22 ssh2`;
}

function flaggedLines(rawLines: string[]): number[] {
  return findBruteForce(parseLines(rawLines.join('\n'))).map((hit) => hit.lineIndex);
}

describe('isFailedLogin', () => {
  it.each([
    'Failed password for root from 1.2.3.4 port 22 ssh2',
    'pam_unix(sshd:auth): authentication failure; rhost=1.2.3.4',
    'Invalid user admin from 1.2.3.4',
    'login failed for user bob',
    '1.2.3.4 - - [03/Nov/2026:10:00:00 +0000] "POST /login HTTP/1.1" 401 12',
    '1.2.3.4 - - [03/Nov/2026:10:00:00 +0000] "POST /login HTTP/1.1" 403 12',
    'ts=1 level=warn status=401 path=/login',
    '{"status":403,"path":"/admin"}',
  ])('accepts: %s', (raw) => {
    expect(isFailedLogin(parseLine(raw, 0))).toBe(true);
  });

  it.each([
    '1.2.3.4 - - [03/Nov/2026:10:00:00 +0000] "GET / HTTP/1.1" 200 4011',
    'listening on port 4011 and 4031',
    'Accepted password for root from 1.2.3.4 port 22 ssh2',
    '{"status":200,"user":"bob"}',
  ])('refuses: %s', (raw) => {
    expect(isFailedLogin(parseLine(raw, 0))).toBe(false);
  });
});

describe('findBruteForce', () => {
  it('flags five failures from one address within five minutes', () => {
    const lines = [0, 20, 40, 60, 80].map((second) => sshFailure(second));
    expect(flaggedLines(lines)).toEqual([0, 1, 2, 3, 4]);
  });

  it('does not flag four failures', () => {
    expect(flaggedLines([0, 20, 40, 60].map((second) => sshFailure(second)))).toEqual([]);
  });

  it('does not flag failures spread over more than five minutes', () => {
    expect(flaggedLines([0, 100, 200, 400, 500].map((second) => sshFailure(second)))).toEqual([]);
  });

  it('does not mix different addresses', () => {
    const lines = [0, 10, 20, 30, 40].map((second, position) =>
      sshFailure(second, `203.0.113.${position + 1}`),
    );
    expect(flaggedLines(lines)).toEqual([]);
  });

  it('counts plain occurrences when the lines have no time', () => {
    const lines = Array.from({ length: 5 }, () => 'Failed password for root from 198.51.100.4');
    expect(flaggedLines(lines)).toEqual([0, 1, 2, 3, 4]);
    expect(flaggedLines(lines.slice(0, 4))).toEqual([]);
  });

  it('reads Apache style times', () => {
    const lines = [0, 10, 20, 30, 40].map(
      (second) =>
        `198.51.100.4 - - [03/Nov/2026:10:00:${String(second).padStart(2, '0')} +0000] "POST /login HTTP/1.1" 401 9`,
    );
    expect(flaggedLines(lines)).toEqual([0, 1, 2, 3, 4]);
  });

  it('ignores failures with no address', () => {
    expect(flaggedLines(Array.from({ length: 6 }, () => 'login failed for user bob'))).toEqual([]);
  });

  it('reports the offending address on every hit', () => {
    const hits = findBruteForce(parseLines([0, 1, 2, 3, 4].map((s) => sshFailure(s)).join('\n')));
    expect(hits.every((hit) => hit.address === '203.0.113.9' && hit.type === 'bruteForce')).toBe(
      true,
    );
  });
});

describe('eventTime', () => {
  it('prefers the parsed time and understands Apache and syslog stamps', () => {
    expect(eventTime(parseLine('2026-11-03T10:00:00Z x', 0))).toBe(
      Date.parse('2026-11-03T10:00:00Z'),
    );
    expect(eventTime(parseLine('[03/Nov/2026:10:00:00 +0000] x', 0))).toBe(
      Date.UTC(2026, 10, 3, 10, 0, 0),
    );
    expect(eventTime(parseLine('Nov  3 10:20:30 host sshd[1]: x', 0))).toBe(
      Date.UTC(2000, 10, 3, 10, 20, 30),
    );
  });

  it('is null when there is no time', () => {
    expect(eventTime(parseLine('no time here', 0))).toBeNull();
  });
});
