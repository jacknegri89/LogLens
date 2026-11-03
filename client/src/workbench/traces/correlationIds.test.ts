import { describe, expect, it } from 'vitest';

import { parseLine, parseLines } from '../core/basicParse';
import { buildCorrelations, extractLineIds } from './correlationIds';

describe('extractLineIds', () => {
  it('reads ids from key=value fields', () => {
    const ids = extractLineIds(parseLine('INFO ok trace_id=abc123 request_id=r-77', 0));
    expect(ids.map((match) => [match.kind, match.id])).toEqual([
      ['trace', 'abc123'],
      ['request', 'r-77'],
    ]);
  });

  it('reads ids from JSON fields, including nested ones', () => {
    const line = parseLine('{"msg":"hi","span":{"trace_id":"t-1"},"http":{"request_id":"q-9"}}', 0);
    expect(extractLineIds(line).map((match) => match.id)).toEqual(['t-1', 'q-9']);
  });

  it('reads the other documented field names', () => {
    const line = parseLine(
      '{"x-correlation-id":"c1","session_id":"s1","orderid":"o1","traceid":"t1","x-request-id":"x1"}',
      0,
    );
    expect(
      extractLineIds(line)
        .map((match) => match.kind)
        .sort(),
    ).toEqual(['correlation', 'order', 'request', 'session', 'trace']);
  });

  it('reads ids written in the message', () => {
    expect(extractLineIds(parseLine('INFO start trace: abcdef123456', 0))[0]).toMatchObject({
      id: 'abcdef123456',
    });
    expect(extractLineIds(parseLine('INFO handled req-9f3a21', 0))[0]).toMatchObject({
      kind: 'request',
      id: 'req-9f3a21',
    });
  });

  it('marks a bracketed id as a guess', () => {
    const [match] = extractLineIds(parseLine('INFO [abc123def456] doing work', 0));
    expect(match).toMatchObject({ id: 'abc123def456', needsRepeat: true });
  });

  it('ignores empty values, placeholders and plain bracketed words', () => {
    expect(extractLineIds(parseLine('INFO trace_id=- request_id=null session_id=0', 0))).toEqual(
      [],
    );
    expect(
      extractLineIds(parseLine('INFO [main-thread] [INFO] [12345678] [Scheduler]', 0)),
    ).toEqual([]);
  });

  it('lists an id once even if it appears in a field and in the text', () => {
    const ids = extractLineIds(parseLine('INFO req-abc123 request_id=req-abc123', 0));
    expect(ids).toHaveLength(1);
  });
});

describe('buildCorrelations', () => {
  const log = [
    '2024-01-01T10:00:00Z INFO [gateway] in trace_id=aaa111',
    '2024-01-01T10:00:00Z INFO [gateway] in trace_id=bbb222',
    '2024-01-01T10:00:01Z INFO [orders] work trace_id=aaa111',
    '2024-01-01T10:00:02Z ERROR [payments] boom trace_id=bbb222',
    '2024-01-01T10:00:03Z INFO [orders] done trace_id=aaa111',
    '2024-01-01T10:00:04Z INFO unrelated trace_id=solo99',
  ].join('\n');
  const correlations = buildCorrelations(parseLines(log));

  it('groups lines by id and counts them', () => {
    expect(correlations.map((item) => [item.id, item.positions.length])).toEqual([
      ['bbb222', 2],
      ['aaa111', 3],
      ['solo99', 1],
    ]);
  });

  it('puts ids with faults first, then the busiest', () => {
    expect(correlations[0]).toMatchObject({ id: 'bbb222', faultCount: 1 });
  });

  it('collects services and the time between first and last line', () => {
    expect(correlations[1].services).toEqual(['gateway', 'orders']);
    expect(correlations[1].durationMs).toBe(3000);
    expect(correlations[2].durationMs).toBeNull();
  });

  it('keeps an id seen once in a field, but not a bracketed guess seen once', () => {
    expect(correlations.some((item) => item.id === 'solo99')).toBe(true);
    const once = buildCorrelations(parseLines('INFO [abc123def456] one\nINFO nothing'));
    expect(once).toEqual([]);
  });

  it('accepts a bracketed id repeated on two lines', () => {
    const repeated = buildCorrelations(
      parseLines('INFO [abc123def456] one\nINFO [abc123def456] two'),
    );
    expect(repeated).toHaveLength(1);
    expect(repeated[0]).toMatchObject({ kind: 'pattern', id: 'abc123def456' });
  });

  it('does not take a number repeated once, or a number that is just a count, for an id', () => {
    expect(buildCorrelations(parseLines('INFO retry 5\nINFO took 5ms\nINFO status 500'))).toEqual(
      [],
    );
  });

  it('returns nothing for an empty log', () => {
    expect(buildCorrelations([])).toEqual([]);
  });
});
