import { describe, expect, it } from 'vitest';

import { parseLines } from '../../core/basicParse';
import { compareLogs, formatNewSignatures, hasDifferences } from './compareLogs';
import { normalizeMessage } from './signature';

const BASELINE = [
  '2025-06-14T10:00:01Z INFO api request 4412 served in 31ms for 10.0.0.5',
  '2025-06-14T10:00:02Z INFO api request 4413 served in 28ms for 10.0.0.6',
  '2025-06-14T10:00:03Z WARN db slow query on orders took 910ms',
  '2025-06-14T10:00:04Z ERROR api cache miss for key user-1001',
].join('\n');

function diff(baseline: string, canary: string) {
  return compareLogs(parseLines(baseline), parseLines(canary));
}

describe('normalizeMessage', () => {
  it('replaces ids, numbers, times and addresses with placeholders', () => {
    const message =
      'order 4412 for 3f2504e0-4f89-41d3-9a0c-0305e82c3301 from 10.0.2.15:5432 at 2025-06-14T10:00:01Z took 1840ms ratio 0.93 trace 9f3ab2c4d5';
    expect(normalizeMessage(message)).toBe(
      'order <n> for <uuid> from <ip> at <time> took <n>ms ratio <n> trace <hex>',
    );
  });

  it('keeps the words that make a message what it is', () => {
    expect(normalizeMessage('connect ECONNREFUSED to payments')).toBe(
      'connect ECONNREFUSED to payments',
    );
  });

  it('gives the same signature to messages that differ only by id and number', () => {
    expect(normalizeMessage('timeout after 3012ms for req-9f3a2c')).toBe(
      normalizeMessage('timeout after 187ms for req-0b11d4'),
    );
  });

  it('gives different signatures to different wording', () => {
    expect(normalizeMessage('connection refused')).not.toBe(normalizeMessage('connection reset'));
  });
});

describe('compareLogs', () => {
  it('finds no difference between identical logs', () => {
    const result = diff(BASELINE, BASELINE);
    expect(hasDifferences(result)).toBe(false);
    expect(result.baseline).toEqual(result.canary);
  });

  it('does not report a change of ids, numbers and times as a new signature', () => {
    const canary = [
      '2025-06-15T08:30:11Z INFO api request 9001 served in 77ms for 10.9.9.9',
      '2025-06-15T08:30:12Z INFO api request 9002 served in 12ms for 10.9.9.8',
      '2025-06-15T08:30:13Z WARN db slow query on orders took 1250ms',
      '2025-06-15T08:30:14Z ERROR api cache miss for key user-7742',
    ].join('\n');
    const result = diff(BASELINE, canary);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it('detects a new fault signature and ranks faults before other new signatures', () => {
    const canary = `${BASELINE}
2025-06-14T10:00:05Z INFO api feature flag refreshed
2025-06-14T10:00:06Z INFO api feature flag refreshed
2025-06-14T10:00:07Z ERROR payments gateway timeout after 5000ms`;
    const result = diff(BASELINE, canary);
    expect(result.added.map((item) => item.signature)).toEqual([
      'payments gateway timeout after <n>ms',
      'api feature flag refreshed',
    ]);
    expect(result.added[0]).toMatchObject({ isFault: true, baselineCount: 0, canaryCount: 1 });
    expect(result.added[0].sample).toContain('gateway timeout after 5000ms');
  });

  it('reports a signature that disappeared', () => {
    const canary = BASELINE.split('\n').slice(0, 3).join('\n');
    const result = diff(BASELINE, canary);
    expect(result.removed.map((item) => item.signature)).toEqual(['api cache miss for key <id>']);
    expect(result.removed[0]).toMatchObject({ baselineCount: 1, canaryCount: 0, isFault: true });
  });

  it('reports a signature that became at least three times more frequent', () => {
    const noisy = Array.from(
      { length: 6 },
      () => '2025-06-14T10:00:09Z WARN db slow query on orders took 880ms',
    );
    const result = diff(BASELINE, `${BASELINE}\n${noisy.join('\n')}`);
    expect(result.shifted).toHaveLength(1);
    expect(result.shifted[0]).toMatchObject({ direction: 'up', baselineCount: 1, canaryCount: 7 });
  });

  it('reports a signature that became at least three times rarer', () => {
    const many = Array.from({ length: 6 }, () => '2025-06-14T10:00:09Z WARN db retry scheduled');
    const result = diff(many.join('\n'), many.slice(0, 1).join('\n'));
    expect(result.shifted[0]).toMatchObject({
      direction: 'down',
      baselineCount: 6,
      canaryCount: 1,
    });
  });

  it('ignores small and moderate changes of count', () => {
    const base = Array.from({ length: 4 }, () => 'INFO job done');
    const canary = Array.from({ length: 8 }, () => 'INFO job done');
    expect(diff(base.join('\n'), canary.join('\n')).shifted).toEqual([]);
    expect(diff('INFO job done', 'INFO job done\nINFO job done').shifted).toEqual([]);
  });

  it('counts lines, faults and distinct signatures of each log', () => {
    const result = diff(BASELINE, 'INFO a\nERROR b\nERROR b');
    expect(result.baseline).toEqual({ lineCount: 4, faultCount: 1, signatureCount: 3 });
    expect(result.canary).toEqual({ lineCount: 3, faultCount: 2, signatureCount: 2 });
  });

  it('handles an empty log on either side', () => {
    const result = diff('', 'ERROR boom');
    expect(result.baseline.lineCount).toBe(0);
    expect(result.added).toHaveLength(1);
    expect(diff('', '').added).toEqual([]);
  });
});

describe('formatNewSignatures', () => {
  it('writes one line per new signature with its count and kind', () => {
    const result = diff(
      'INFO ok',
      'INFO ok\nERROR disk full on /dev/sda1\nERROR disk full on /dev/sda1',
    );
    expect(formatNewSignatures(result)).toBe('2x [fault] disk full on /dev/sda1');
  });

  it('is empty when nothing is new', () => {
    expect(formatNewSignatures(diff(BASELINE, BASELINE))).toBe('');
  });
});
