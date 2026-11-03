import { describe, expect, it } from 'vitest';

import { parseLine, parseLines } from '../../core/basicParse';
import { filterLines, highlightTerms, matchesQuery } from './matchQuery';
import { parseQuery } from './parseQuery';
import { splitHighlights } from './highlight';

const LOG = [
  '2026-11-03T09:00:00Z INFO [gateway] GET /healthcheck status=200 latency=3ms',
  '2026-11-03T09:00:01Z ERROR [payment] charge failed status=502 latency=340ms trace_id=abc user=ann',
  '2026-11-03T09:00:02Z ERROR [payment] healthcheck failed status=503 latency=900ms',
  '2026-11-03T09:00:03Z WARN [payments-api] slow call status=200 latency=210ms',
  '2026-11-03T09:00:04Z FATAL [ledger] connection refused by db status=500 latency=12ms',
  '2026-11-03T09:00:05Z INFO [payment] charge ok status=201 latency=40ms user=bob',
].join('\n');
const LINES = parseLines(LOG);

function matching(query: string): number[] {
  return filterLines(LINES, parseQuery(query));
}

describe('parseQuery and filterLines', () => {
  it('runs the documented example', () => {
    expect(matching('level:ERROR service:payment latency:>200 -healthcheck')).toEqual([1]);
  });

  it('matches every line for an empty or blank query', () => {
    expect(matching('')).toEqual([0, 1, 2, 3, 4, 5]);
    expect(matching('   ')).toHaveLength(6);
  });

  it('reads fields case-insensitively, including keys of the line', () => {
    expect(matching('LEVEL:error')).toEqual([1, 2]);
    expect(matching('trace_id:ABC')).toEqual([1]);
    expect(matching('user:bob')).toEqual([5]);
  });

  it('compares numbers', () => {
    expect(matching('latency:<=40')).toEqual([0, 4, 5]);
    expect(matching('status:>=500')).toEqual([1, 2, 4]);
    expect(matching('latency:>0.5s')).toEqual([2]);
  });

  it('supports wildcards in values', () => {
    expect(matching('status:5*')).toEqual([1, 2, 4]);
    expect(matching('service:pay*')).toEqual([1, 2, 3, 5]);
    expect(matching('service:payment')).toEqual([1, 2, 5]);
  });

  it('negates words and fields', () => {
    expect(matching('-level:INFO -level:ERROR')).toEqual([3, 4]);
    expect(matching('charge -failed')).toEqual([5]);
  });

  it('searches quoted phrases and free text in the raw line', () => {
    expect(matching('"connection refused"')).toEqual([4]);
    expect(matching('"refused connection"')).toEqual([]);
    expect(matching('CHARGE')).toEqual([1, 5]);
  });

  it('joins groups with OR', () => {
    expect(matching('level:ERROR OR level:FATAL')).toEqual([1, 2, 4]);
    expect(matching('user:ann OR user:bob latency:<100')).toEqual([1, 5]);
  });

  it('searches inside the message field and accepts level aliases', () => {
    expect(matching('message:slow')).toEqual([3]);
    expect(matching('level:warning')).toEqual([3]);
  });
});

describe('half-typed or invalid queries', () => {
  it('never throws and reports what it read as plain text', () => {
    for (const input of [
      'level:',
      'latency:>',
      'latency:>abc',
      '"unclosed',
      '-',
      'OR',
      '(a',
      ':x',
    ]) {
      expect(() => matching(input)).not.toThrow();
    }
    expect(parseQuery('level:').unreadParts).toEqual(['level:']);
    expect(parseQuery('latency:>abc').unreadParts).toEqual(['latency:>abc']);
  });

  it('treats an unread part as free text', () => {
    expect(matching('latency:>abc')).toEqual([]);
    expect(matching('"connection refused')).toEqual([4]);
  });

  it('reports a dangling OR and ignores it', () => {
    const query = parseQuery('level:FATAL OR');
    expect(query.unreadParts).toEqual(['OR']);
    expect(filterLines(LINES, query)).toEqual([4]);
  });

  it('drops parentheses but keeps their terms', () => {
    const query = parseQuery('(level:FATAL OR level:WARN)');
    expect(query.unreadParts).toEqual(['( )']);
    expect(filterLines(LINES, query)).toEqual([3, 4]);
  });

  it('keeps URLs and clock times as text', () => {
    expect(parseQuery('http://example.com 09:00:01').groups[0].map((term) => term.kind)).toEqual([
      'text',
      'text',
    ]);
  });

  it('treats regex characters in wildcard values literally', () => {
    const line = parseLine('INFO path=/a.b(c)', 0);
    expect(matchesQuery(line, parseQuery('path:/a.b(c*'))).toBe(true);
    expect(matchesQuery(line, parseQuery('path:/axb*'))).toBe(false);
  });
});

describe('highlights', () => {
  it('collects positive words and field values, not levels or negations', () => {
    expect(
      highlightTerms(parseQuery('level:ERROR trace_id:abc "conn refused" -noise latency:>2 x')),
    ).toEqual(['abc', 'conn refused']);
    expect(highlightTerms(parseQuery('user:an*na'))).toEqual(['an']);
  });

  it('splits a text into marked and plain pieces, merging overlaps', () => {
    expect(splitHighlights('Charge failed: charge', ['charge', 'arg'])).toEqual([
      { text: 'Charge', marked: true },
      { text: ' failed: ', marked: false },
      { text: 'charge', marked: true },
    ]);
    expect(splitHighlights('nothing here', ['zzz'])).toEqual([
      { text: 'nothing here', marked: false },
    ]);
    expect(splitHighlights('plain', [])).toEqual([{ text: 'plain', marked: false }]);
  });
});
