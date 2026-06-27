import { describe, expect, it } from 'vitest';

import { parseLog } from './logParser';

describe('parseLog', () => {
  // ── Empty / whitespace input ─────────────────────────────────────────────

  it('returns zero counts for empty input', () => {
    const r = parseLog('');
    expect(r.totalLines).toBe(0);
    expect(r.matchedCount).toBe(0);
    expect(r.excerpt).toBe('');
    expect(r.truncated).toBe(false);
  });

  it('treats whitespace-only input as empty', () => {
    const r = parseLog('   \n   \n');
    expect(r.totalLines).toBe(0);
    expect(r.matchedCount).toBe(0);
  });

  // ── Category classification ──────────────────────────────────────────────

  it('classifies ERROR lines as error', () => {
    const r = parseLog('Something ERROR occurred');
    expect(r.relevantLines[0].category).toBe('error');
    expect(r.severityHint).toBe('high');
  });

  it('classifies FATAL as error', () => {
    const r = parseLog('FATAL: process died');
    expect(r.relevantLines[0].category).toBe('error');
  });

  it('classifies exception lines', () => {
    const r = parseLog('java.lang.NullPointerException: cannot read property');
    expect(r.relevantLines[0].category).toBe('exception');
    expect(r.severityHint).toBe('high');
  });

  it('classifies stack frame lines', () => {
    const r = parseLog('  at MyClass.method (file.js:42:5)');
    expect(r.relevantLines[0].category).toBe('stack');
  });

  it('classifies WARN lines as warning', () => {
    const r = parseLog('WARN: disk usage at 90%');
    expect(r.relevantLines[0].category).toBe('warning');
    expect(r.severityHint).toBe('low');
  });

  it('classifies timeout lines', () => {
    const r = parseLog('Connection timed out after 30s');
    expect(r.relevantLines[0].category).toBe('timeout');
    expect(r.severityHint).toBe('medium');
  });

  it('classifies failure lines', () => {
    const r = parseLog('Service failed to start');
    expect(r.relevantLines[0].category).toBe('failure');
    expect(r.severityHint).toBe('medium');
  });

  it('classifies OOMKilled as failure', () => {
    const r = parseLog('container OOMKilled — out of memory');
    expect(r.relevantLines[0].category).toBe('failure');
  });

  // ── First-match-wins ordering ────────────────────────────────────────────

  it('stack wins over error keyword on same line', () => {
    const r = parseLog('  at Error.captureStackTrace');
    expect(r.relevantLines[0].category).toBe('stack');
  });

  it('exception wins over warning on same line', () => {
    // "IOException" contains "exception" which matches before "warn"
    const r = parseLog('WARNING: IOException thrown');
    expect(r.relevantLines[0].category).toBe('exception');
  });

  // ── Fallback: no matches ─────────────────────────────────────────────────

  it('returns tail lines with category context when nothing matches', () => {
    const r = parseLog('Line 1\nLine 2\nLine 3');
    expect(r.matchedCount).toBe(0);
    expect(r.relevantLines.length).toBe(3);
    expect(r.relevantLines.every((l) => l.category === 'context')).toBe(true);
  });

  it('respects fallbackTailLines option', () => {
    const log = Array.from({ length: 10 }, (_, i) => `Line ${i}`).join('\n');
    const r = parseLog(log, { fallbackTailLines: 3 });
    expect(r.relevantLines.length).toBe(3);
    expect(r.relevantLines[0].content).toBe('Line 7');
  });

  it('matchedCount stays 0 in fallback mode', () => {
    const r = parseLog('just plain text');
    expect(r.matchedCount).toBe(0);
  });

  // ── Windows line endings ─────────────────────────────────────────────────

  it('handles CRLF line endings', () => {
    const r = parseLog('INFO: ok\r\nERROR: boom\r\n');
    expect(r.totalLines).toBe(2);
    expect(r.matchedCount).toBe(1);
    expect(r.relevantLines[0].category).toBe('error');
  });

  // ── Line numbers ─────────────────────────────────────────────────────────

  it('preserves 1-based original line numbers', () => {
    const r = parseLog('ok\nERROR: fail\nok again');
    expect(r.relevantLines[0].lineNumber).toBe(2);
  });

  // ── Limits ───────────────────────────────────────────────────────────────

  it('caps at maxLines and sets truncated', () => {
    const log = Array.from({ length: 10 }, (_, i) => `ERROR line ${i}`).join('\n');
    const r = parseLog(log, { maxLines: 3 });
    expect(r.relevantLines.length).toBe(3);
    expect(r.truncated).toBe(true);
  });

  it('caps excerpt at maxChars and sets truncated', () => {
    const log = 'ERROR: ' + 'x'.repeat(200);
    const r = parseLog(log, { maxChars: 50 });
    expect(r.excerpt.length).toBeLessThanOrEqual(50);
    expect(r.truncated).toBe(true);
  });

  it('truncates individual long lines with a marker', () => {
    const log = 'ERROR: ' + 'x'.repeat(1100);
    const r = parseLog(log, { maxLineLength: 20 });
    expect(r.relevantLines[0].content).toContain('(truncated)');
  });

  // ── Excerpt ──────────────────────────────────────────────────────────────

  it('joins matched lines with newlines in excerpt', () => {
    const r = parseLog('ERROR: a\nERROR: b');
    expect(r.excerpt).toBe('ERROR: a\nERROR: b');
  });

  // ── Severity precedence ──────────────────────────────────────────────────

  it('severityHint is high when errors and warnings are both present', () => {
    const r = parseLog('ERROR: boom\nWARN: disk');
    expect(r.severityHint).toBe('high');
  });

  it('severityHint is medium for failure without error', () => {
    const r = parseLog('Service failed to start');
    expect(r.severityHint).toBe('medium');
  });

  it('severityHint is low for warnings only', () => {
    const r = parseLog('WARN: something minor');
    expect(r.severityHint).toBe('low');
  });
});
