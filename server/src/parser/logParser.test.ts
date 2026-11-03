import { describe, expect, it } from 'vitest';

import { parseLog } from './logParser';

describe('parseLog error words', () => {
  it('does not treat a metric named errors_count as an error', () => {
    const result = parseLog('INFO metrics errors_count=0 failed_jobs=0 timeout_ms=300');

    expect(result.relevantLines.map((line) => line.category)).not.toContain('error');
    expect(result.relevantLines.map((line) => line.category)).not.toContain('timeout');
  });

  it('still recognises TypeError and KeyError as errors', () => {
    const result = parseLog('TypeError: x is undefined\nKeyError: 42');

    expect(result.relevantLines.map((line) => line.category)).toEqual(['error', 'error']);
  });
});

describe('parseLog', () => {
  // ── Empty / whitespace input ─────────────────────────────────────────────

  it('returns zero counts for empty input', () => {
    const result = parseLog('');
    expect(result.totalLines).toBe(0);
    expect(result.matchedCount).toBe(0);
    expect(result.excerpt).toBe('');
    expect(result.truncated).toBe(false);
  });

  it('treats whitespace-only input as empty', () => {
    const result = parseLog('   \n   \n');
    expect(result.totalLines).toBe(0);
    expect(result.matchedCount).toBe(0);
  });

  // ── Category classification ──────────────────────────────────────────────

  it('classifies ERROR lines as error', () => {
    const result = parseLog('Something ERROR occurred');
    expect(result.relevantLines[0].category).toBe('error');
    expect(result.severityHint).toBe('high');
  });

  it('classifies FATAL as error', () => {
    const result = parseLog('FATAL: process died');
    expect(result.relevantLines[0].category).toBe('error');
  });

  it('classifies exception lines', () => {
    const result = parseLog('java.lang.NullPointerException: cannot read property');
    expect(result.relevantLines[0].category).toBe('exception');
    expect(result.severityHint).toBe('high');
  });

  it('classifies stack frame lines', () => {
    const result = parseLog('  at MyClass.method (file.js:42:5)');
    expect(result.relevantLines[0].category).toBe('stack');
  });

  it('classifies WARN lines as warning', () => {
    const result = parseLog('WARN: disk usage at 90%');
    expect(result.relevantLines[0].category).toBe('warning');
    expect(result.severityHint).toBe('low');
  });

  it('classifies timeout lines', () => {
    const result = parseLog('Connection timed out after 30s');
    expect(result.relevantLines[0].category).toBe('timeout');
    expect(result.severityHint).toBe('medium');
  });

  it('classifies failure lines', () => {
    const result = parseLog('Service failed to start');
    expect(result.relevantLines[0].category).toBe('failure');
    expect(result.severityHint).toBe('medium');
  });

  it('classifies OOMKilled as failure', () => {
    const result = parseLog('container OOMKilled — out of memory');
    expect(result.relevantLines[0].category).toBe('failure');
  });

  // ── First-match-wins ordering ────────────────────────────────────────────

  it('stack wins over error keyword on same line', () => {
    const result = parseLog('  at Error.captureStackTrace');
    expect(result.relevantLines[0].category).toBe('stack');
  });

  it('exception wins over warning on same line', () => {
    // "IOException" contains "exception" which matches before "warn"
    const result = parseLog('WARNING: IOException thrown');
    expect(result.relevantLines[0].category).toBe('exception');
  });

  // ── Fallback: no matches ─────────────────────────────────────────────────

  it('returns tail lines with category context when nothing matches', () => {
    const result = parseLog('Line 1\nLine 2\nLine 3');
    expect(result.matchedCount).toBe(0);
    expect(result.relevantLines.length).toBe(3);
    expect(result.relevantLines.every((l) => l.category === 'context')).toBe(true);
  });

  it('respects fallbackTailLines option', () => {
    const log = Array.from({ length: 10 }, (_, i) => `Line ${i}`).join('\n');
    const result = parseLog(log, { fallbackTailLines: 3 });
    expect(result.relevantLines.length).toBe(3);
    expect(result.relevantLines[0].content).toBe('Line 7');
  });

  it('matchedCount stays 0 in fallback mode', () => {
    const result = parseLog('just plain text');
    expect(result.matchedCount).toBe(0);
  });

  // ── Windows line endings ─────────────────────────────────────────────────

  it('handles CRLF line endings', () => {
    const result = parseLog('INFO: ok\r\nERROR: boom\r\n');
    expect(result.totalLines).toBe(2);
    expect(result.matchedCount).toBe(1);
    expect(result.relevantLines[0].category).toBe('error');
  });

  // ── Line numbers ─────────────────────────────────────────────────────────

  it('preserves 1-based original line numbers', () => {
    const result = parseLog('ok\nERROR: fail\nok again');
    expect(result.relevantLines[0].lineNumber).toBe(2);
  });

  // ── Limits ───────────────────────────────────────────────────────────────

  it('caps at maxLines and sets truncated', () => {
    const log = Array.from({ length: 10 }, (_, i) => `ERROR line ${i}`).join('\n');
    const result = parseLog(log, { maxLines: 3 });
    expect(result.relevantLines.length).toBe(3);
    expect(result.truncated).toBe(true);
  });

  it('caps excerpt at maxChars and sets truncated', () => {
    const log = 'ERROR: ' + 'x'.repeat(200);
    const result = parseLog(log, { maxChars: 50 });
    expect(result.excerpt.length).toBeLessThanOrEqual(50);
    expect(result.truncated).toBe(true);
  });

  it('truncates individual long lines with a marker', () => {
    const log = 'ERROR: ' + 'x'.repeat(1100);
    const result = parseLog(log, { maxLineLength: 20 });
    expect(result.relevantLines[0].content).toContain('(truncated)');
  });

  // ── Excerpt ──────────────────────────────────────────────────────────────

  it('joins matched lines with newlines in excerpt', () => {
    const result = parseLog('ERROR: a\nERROR: b');
    expect(result.excerpt).toBe('ERROR: a\nERROR: b');
  });

  // ── Severity precedence ──────────────────────────────────────────────────

  it('severityHint is high when errors and warnings are both present', () => {
    const result = parseLog('ERROR: boom\nWARN: disk');
    expect(result.severityHint).toBe('high');
  });

  it('severityHint is medium for failure without error', () => {
    const result = parseLog('Service failed to start');
    expect(result.severityHint).toBe('medium');
  });

  it('severityHint is low for warnings only', () => {
    const result = parseLog('WARN: something minor');
    expect(result.severityHint).toBe('low');
  });

  // ── Log types without the usual keywords ─────────────────────────────────

  it('keeps Python traceback frames, which have no keyword', () => {
    const log = [
      'Traceback (most recent call last):',
      '  File "app.py", line 12, in get_first',
      '    return items[3]',
      'IndexError: list index out of range',
    ].join('\n');
    const result = parseLog(log);
    expect(result.relevantLines.map((line) => line.lineNumber)).toEqual([1, 2, 4]);
    expect(result.relevantLines[1].category).toBe('stack');
  });

  it('keeps an access-log line with a 5xx status even without a keyword', () => {
    const result = parseLog(
      '203.0.113.7 - - [02/Nov/2026:10:14:02 +0000] "GET /shop HTTP/1.1" 502 612',
    );
    expect(result.matchedCount).toBe(1);
    expect(result.relevantLines[0].category).toBe('server-error');
    expect(result.severityHint).toBe('high');
  });

  it('classifies an attack request as attack even when the server answered 404', () => {
    const result = parseLog(
      '203.0.113.7 - - [02/Nov/2026:10:14:02 +0000] "GET /p?id=1 UNION SELECT password FROM users HTTP/1.1" 404 - "sqlmap/1.8"',
    );
    expect(result.relevantLines[0].category).toBe('attack');
    expect(result.severityHint).toBe('high');
  });

  it('gives a 4xx status a low severity hint', () => {
    const result = parseLog(
      '203.0.113.9 - - [02/Nov/2026:10:14:05 +0000] "GET /old-page HTTP/1.1" 404 120',
    );
    expect(result.relevantLines[0].category).toBe('client-error');
    expect(result.severityHint).toBe('low');
  });

  // ── Keeping the end of a long log ────────────────────────────────────────

  it('keeps the last lines of a long log, where the root cause usually is', () => {
    const noise = Array.from({ length: 150 }, (_, i) => `ERROR retry ${i}`);
    const log = [
      ...noise,
      'Caused by: org.postgresql.util.PSQLException: password authentication failed',
    ];
    const result = parseLog(log.join('\n'), { maxLines: 10 });
    expect(result.truncated).toBe(true);
    expect(result.relevantLines.at(-1)?.content).toContain('PSQLException');
  });

  it('keeps the end of the excerpt when it is cut by maxChars', () => {
    const log = [
      'ERROR start',
      ...Array.from({ length: 50 }, (_, i) => `ERROR filler ${i}`),
      'FATAL root cause',
    ];
    const result = parseLog(log.join('\n'), { maxChars: 120 });
    expect(result.excerpt.length).toBeLessThanOrEqual(120);
    expect(result.excerpt).toContain('FATAL root cause');
    expect(result.excerpt).toContain('lines omitted');
  });
});

describe('parseLog successful logins', () => {
  it('keeps an accepted login next to the failed ones, so a break-in can be seen', () => {
    const log = [
      'Nov  3 09:14:12 host sshd[1]: Failed password for root from 203.0.113.7 port 1 ssh2',
      'Nov  3 09:14:13 host sshd[1]: Accepted password for root from 203.0.113.7 port 2 ssh2',
    ].join('\n');

    const result = parseLog(log);

    expect(result.excerpt).toContain('Accepted password for root');
  });

  it('does not raise the severity for an accepted login on its own', () => {
    const result = parseLog(
      'Nov  3 09:14:13 host sshd[1]: Accepted publickey for deploy from 10.0.0.2',
    );

    expect(result.severityHint).toBe('low');
  });
});
