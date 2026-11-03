import { describe, expect, it } from 'vitest';

import { parseLine, parseLines } from './basicParse';

describe('parseLine', () => {
  it('reads time, level, service, fields and latency of a text line', () => {
    const line = parseLine(
      '2026-11-03T09:14:07Z ERROR [payment] charge failed trace_id=abc123 latency=240ms',
      4,
    );

    expect(line.index).toBe(4);
    expect(line.timestamp).toBe(Date.parse('2026-11-03T09:14:07Z'));
    expect(line.level).toBe('ERROR');
    expect(line.service).toBe('payment');
    expect(line.fields.trace_id).toBe('abc123');
    expect(line.latencyMs).toBe(240);
    expect(line.isFault).toBe(true);
  });

  it('flattens a JSON line', () => {
    const line = parseLine(
      '{"time":"2026-11-03T09:14:07Z","level":"warn","service":"api","msg":"slow","latency_ms":512}',
      0,
    );

    expect(line.level).toBe('WARN');
    expect(line.service).toBe('api');
    expect(line.message).toBe('slow');
    expect(line.latencyMs).toBe(512);
    expect(line.isFault).toBe(false);
  });

  it('marks stack frames as faults and keeps plain lines quiet', () => {
    expect(parseLine('    at getOrders (/app/orders.js:42:18)', 1).isFault).toBe(true);
    expect(parseLine('INFO server listening on :8080', 2).isFault).toBe(false);
  });

  it('marks panics, OOM kills and named errors without a level as faults', () => {
    expect(parseLine("thread 'tokio-runtime-worker' panicked at src/main.rs:4:9", 0).isFault).toBe(
      true,
    );
    expect(parseLine('Last State: Terminated Reason: OOMKilled', 0).isFault).toBe(true);
    expect(parseLine('java.lang.OutOfMemoryError: Java heap space', 0).isFault).toBe(true);
    expect(parseLine('TypeError: Cannot read properties of undefined', 0).isFault).toBe(true);
  });

  it('does not flag lines that only mention errors in passing', () => {
    expect(parseLine('INFO build finished, 0 errors: none', 0).isFault).toBe(false);
    expect(parseLine('INFO retried after a panicky moment', 0).isFault).toBe(false);
  });

  it('gives a usable line when nothing is recognised', () => {
    const line = parseLine('just some words', 0);

    expect(line.timestamp).toBeNull();
    expect(line.level).toBeNull();
    expect(line.message).toBe('just some words');
  });
});

describe('parseLines', () => {
  it('skips empty lines but keeps the original numbering', () => {
    const lines = parseLines('first\n\n  \nfourth');

    expect(lines.map((line) => line.index)).toEqual([0, 3]);
  });
});
