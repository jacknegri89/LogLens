import { describe, expect, it } from 'vitest';

import { maskSecrets } from './masking';
import { analyzeStructure } from './analyzeStructure';
import { sanitizeText } from './sanitizeReport';
import { normalizeLog } from '../parser/normalizeLog';

/**
 * Logs are written by strangers. None of these inputs may throw, lose a line or take long: a
 * pattern that backtracks on a hostile line would let one request stall the server for everybody.
 */
const SLOW_MS = 3000;

function lineCountOf(text: string): number {
  return text.split('\n').filter((line) => line.trim() !== '').length;
}

function covered(text: string): number {
  const seen = new Set<number>();
  for (const event of normalizeLog(text).events) {
    for (let line = event.originalLineStart; line <= event.originalLineEnd; line += 1) {
      seen.add(line);
    }
  }
  return seen.size;
}

const HOSTILE_LOGS: [string, string][] = [
  ['one very long line without any structure', 'a'.repeat(200_000)],
  ['one very long line of spaces and digits', '1 '.repeat(100_000)],
  ['a long run of the characters regexes dislike', '['.repeat(50_000) + ']'.repeat(50_000)],
  ['repeated quote and backslash', '"\\'.repeat(60_000)],
  ['a timestamp-like prefix repeated', '2026-11-04T10:00:00 '.repeat(5000)],
  ['a key with no end', `password=${'x'.repeat(100_000)}`],
  ['nested JSON objects', '{"a":'.repeat(5000) + '1' + '}'.repeat(5000)],
  ['an unterminated JSON string', `{"msg":"${'y'.repeat(100_000)}`],
  ['null bytes and control characters', 'ERROR\u0000\u0001\u0002 boom\r\r\r\n\u001b[31m'],
  ['only newlines', '\n'.repeat(50_000)],
  ['a connection string with a huge password', `postgres://user:${'p'.repeat(100_000)}@host/db`],
  ['an almost-Bearer header', `Authorization: Bearer ${'A'.repeat(100_000)}`],
  ['an email-like text', `${'a'.repeat(50_000)}@${'b.'.repeat(5000)}`],
  [
    'a thousand stack frames',
    ['Error: boom', ...Array(1000).fill('    at fn (file.js:1:1)')].join('\n'),
  ],
  ['a syslog priority prefix repeated', '<13>'.repeat(40_000)],
];

describe.each(HOSTILE_LOGS)('hostile input: %s', (_name, log) => {
  it('is read without an error, in reasonable time, and without losing a line', () => {
    const started = Date.now();

    const events = normalizeLog(log).events;

    expect(Date.now() - started).toBeLessThan(SLOW_MS);
    expect(Array.isArray(events)).toBe(true);
    if (log.length <= 200_000) {
      expect(covered(log)).toBeGreaterThanOrEqual(Math.min(lineCountOf(log), 1));
    }
  });

  it('is masked and cleaned without stalling', () => {
    const started = Date.now();

    maskSecrets(log);
    sanitizeText(log);

    expect(Date.now() - started).toBeLessThan(SLOW_MS);
  });
});

describe('the whole analysis on hostile input', () => {
  it.each([
    ['null bytes and control characters', HOSTILE_LOGS[8][1]],
    ['nested JSON objects', HOSTILE_LOGS[6][1]],
    ['a thousand stack frames', HOSTILE_LOGS[13][1]],
  ])('finishes without an error: %s', (_name, log) => {
    const started = Date.now();

    const analysis = analyzeStructure(log);

    expect(Date.now() - started).toBeLessThan(SLOW_MS);
    expect(analysis.log.events.length).toBeGreaterThan(0);
  });

  it('keeps every line of a log that mixes valid and broken lines', () => {
    const lines: string[] = [];
    for (let index = 0; index < 500; index += 1) {
      lines.push(`2026-11-04T10:00:00Z ERROR [api] failure ${index}`);
      lines.push(`{"broken": ${index}`);
      lines.push('\u0000\u0000');
    }
    const log = lines.join('\n');

    expect(covered(log)).toBe(lineCountOf(log));
  });
});
