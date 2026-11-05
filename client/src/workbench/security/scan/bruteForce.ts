import type { ParsedLine } from '../../types';
import { extractAddress } from './address';
import { BRUTE_FORCE_SIGNATURE_ID } from './signatures';
import type { AttackHit } from './types';

export const BRUTE_FORCE_WINDOW_MS = 5 * 60 * 1000;
export const BRUTE_FORCE_THRESHOLD = 5;

const FAILURE_WORDS =
  /failed password|authentication fail|auth(?:entication)? failed|login (?:failed|failure|incorrect)|failed login|invalid user|invalid password|incorrect password|bad credentials|invalid credentials|wrong password|access denied for user|unauthorized/i;
const DENIED_STATUS =
  /\bhttp\/[\d.]+"?\s+(?:401|403)\b|\b(?:status|code|response)[=: ]+(?:401|403)\b/i;
const CLF_TIME = /\[(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/;
const SYSLOG_TIME = /^([A-Za-z]{3})\s+(\d{1,2})\s(\d{2}):(\d{2}):(\d{2})\b/;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** A rejected login: a failure message or an HTTP 401 / 403 answer. */
export function isFailedLogin(line: ParsedLine): boolean {
  const status = line.fields.status ?? line.fields.status_code;
  return (
    status === '401' ||
    status === '403' ||
    FAILURE_WORDS.test(line.raw) ||
    DENIED_STATUS.test(line.raw)
  );
}

function utcTime(year: number, month: string, parts: string[]): number | null {
  const monthIndex = MONTHS.indexOf(month.toLowerCase());
  if (monthIndex === -1) {
    return null;
  }
  const [day, hour, minute, second] = parts.map(Number);
  return Date.UTC(year, monthIndex, day, hour, minute, second);
}

/** Time of a line: the parsed one, else Apache / nginx "[03/Nov/2026:10:20:30", else syslog "Nov  3 10:20:30". */
export function eventTime(line: ParsedLine): number | null {
  if (line.timestamp !== null) {
    return line.timestamp;
  }
  const clf = CLF_TIME.exec(line.raw);
  if (clf) {
    return utcTime(Number(clf[3]), clf[2], [clf[1], clf[4], clf[5], clf[6]]);
  }
  const syslog = SYSLOG_TIME.exec(line.raw);
  // Syslog has no year; only the distance between two lines matters here.
  if (syslog) {
    return utcTime(2000, syslog[1], [syslog[2], syslog[3], syslog[4], syslog[5]]);
  }
  return null;
}

interface FailedAttempt {
  lineIndex: number;
  time: number | null;
}

/** Positions of the attempts that sit in a window holding at least the threshold. */
function indexesInBusyWindows(times: number[]): Set<number> {
  const busy = new Set<number>();
  let start = 0;
  let lastMarked = -1;
  for (let end = 0; end < times.length; end += 1) {
    while (times[end] - times[start] > BRUTE_FORCE_WINDOW_MS) {
      start += 1;
    }
    if (end - start + 1 >= BRUTE_FORCE_THRESHOLD) {
      for (let inside = Math.max(start, lastMarked + 1); inside <= end; inside += 1) {
        busy.add(inside);
      }
      lastMarked = end;
    }
  }
  return busy;
}

function flaggedAttempts(attempts: FailedAttempt[]): FailedAttempt[] {
  const timed = attempts.filter((attempt) => attempt.time !== null);
  timed.sort((left, right) => (left.time ?? 0) - (right.time ?? 0));
  const busy = indexesInBusyWindows(timed.map((attempt) => attempt.time ?? 0));
  const untimed = attempts.filter((attempt) => attempt.time === null);
  let flaggedUntimed: FailedAttempt[] = [];
  if (untimed.length >= BRUTE_FORCE_THRESHOLD) {
    flaggedUntimed = untimed;
  }
  return [...timed.filter((_attempt, position) => busy.has(position)), ...flaggedUntimed];
}

function attemptsByAddress(lines: readonly ParsedLine[]): Map<string, FailedAttempt[]> {
  const byAddress = new Map<string, FailedAttempt[]>();
  for (const line of lines) {
    if (!isFailedLogin(line)) {
      continue;
    }
    const address = extractAddress(line.raw, line.fields);
    if (address === null) {
      continue;
    }
    const attempts = byAddress.get(address) ?? [];
    attempts.push({ lineIndex: line.index, time: eventTime(line) });
    byAddress.set(address, attempts);
  }
  return byAddress;
}

/** Five or more rejected logins from one address within five minutes (or five with no times at all). */
export function findBruteForce(lines: readonly ParsedLine[]): AttackHit[] {
  const hits: AttackHit[] = [];
  for (const [address, attempts] of attemptsByAddress(lines)) {
    for (const attempt of flaggedAttempts(attempts)) {
      hits.push({
        lineIndex: attempt.lineIndex,
        type: 'bruteForce',
        signatureId: BRUTE_FORCE_SIGNATURE_ID,
        address,
      });
    }
  }
  return hits;
}
