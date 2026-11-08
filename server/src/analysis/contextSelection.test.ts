import { describe, expect, it } from 'vitest';

import { normalizeLog } from '../parser/normalizeLog';
import { splitIntoChunks } from './chunking';
import { classifyEvent } from './eventClassification';
import { DEFAULT_SELECTION_OPTIONS, selectContext } from './contextSelection';

function stamp(second: number): string {
  return `2026-11-03T10:00:${String(second % 60).padStart(2, '0')}Z`;
}

function logOf(lines: string[]) {
  return normalizeLog(lines.join('\n'));
}

describe('classifyEvent', () => {
  function classify(line: string) {
    return classifyEvent(normalizeLog(line).events[0]);
  }

  it('rates an error as a strong anomaly and a warning as a medium one', () => {
    expect(classify(`${stamp(1)} ERROR db down`).anomaly?.strength).toBe('high');
    expect(classify(`${stamp(1)} WARN slow query`).anomaly?.strength).toBe('medium');
  });

  it('finds a problem that an INFO line describes in words', () => {
    expect(classify(`${stamp(1)} INFO payment failed for order O-1`).anomaly?.strength).toBe(
      'medium',
    );
  });

  it('treats an HTTP 409 as a client-side anomaly of medium strength, never as a server fault', () => {
    const anomaly = classify(`${stamp(1)} INFO checkout status=409 reason=conflict`).anomaly;

    expect(anomaly?.strength).toBe('medium');
    expect(anomaly?.reasons).toContain('status 409');
  });

  it('keeps an INFO deployment and a configuration change as significant', () => {
    expect(classify(`${stamp(1)} INFO deployment v2.4.1 rolled out`).significant).toBe('change');
    expect(
      classify(`${stamp(1)} INFO config reload reservation.ttlMs 900000 -> 900`).significant,
    ).toBe('change');
    expect(classify(`${stamp(1)} INFO payment confirmed order=O-1`).significant).toBe('state');
  });

  it('recognises a health check as routine, unless it reports a failure', () => {
    expect(
      classify('10.0.0.1 - - [03/Nov/2026:10:00:00 +0000] "GET /healthz HTTP/1.1" 200 2').routine,
    ).toBe('health-check');
    expect(
      classify('10.0.0.1 - - [03/Nov/2026:10:00:00 +0000] "GET /healthz HTTP/1.1" 503 2').routine,
    ).toBeNull();
  });
});

describe('selectContext', () => {
  it('keeps an error with the events around it and leaves the far quiet events out', () => {
    const quiet = Array.from({ length: 40 }, (_, index) => `${stamp(index)} INFO tick ${index}`);
    const lines = [
      ...quiet.slice(0, 20),
      `${stamp(20)} ERROR db connection refused`,
      ...quiet.slice(20),
    ];
    const selection = selectContext(logOf(lines));
    const messages = selection.selected.map(({ event }) => event.message);

    expect(messages).toContain('db connection refused');
    expect(messages).toContain('tick 19');
    expect(messages).toContain('tick 21');
    expect(messages).not.toContain('tick 0');
    expect(selection.coverage.notSelected).toBeGreaterThan(30);
    expect(selection.coverage.complete).toBe(true);
  });

  it('keeps INFO changes and state transitions even when nothing near them fails', () => {
    const lines = [
      `${stamp(1)} INFO deployment d-77 started version=2.4.1`,
      ...Array.from({ length: 30 }, (_, index) => `${stamp(index + 2)} INFO tick ${index}`),
      `${stamp(40)} INFO payment confirmed order=O-1`,
    ];
    const selection = selectContext(logOf(lines));
    const reasons = selection.selected.map((entry) => entry.reasons);

    expect(reasons[0]).toContain('change');
    expect(selection.selected.at(-1)?.reasons).toContain('state');
  });

  it('keeps an event that shares an identifier with an anomaly, even a health check', () => {
    const lines = [
      `${stamp(1)} INFO GET /health request_id=req-9 status=200`,
      ...Array.from({ length: 30 }, (_, index) => `${stamp(index + 2)} INFO tick ${index}`),
      `${stamp(40)} ERROR upstream failed request_id=req-9`,
    ];
    const selection = selectContext(logOf(lines));

    expect(selection.selected[0].event.message).toContain('/health');
    expect(selection.selected[0].reasons).toContain('shared-identifier');
  });

  it('counts routine traffic that it left out, apart from the other events it did not select', () => {
    const lines = [
      ...Array.from(
        { length: 10 },
        () => '10.0.0.1 - - [03/Nov/2026:10:00:00 +0000] "GET /healthz HTTP/1.1" 200 2',
      ),
      ...Array.from({ length: 30 }, (_, index) => `${stamp(index)} INFO tick ${index}`),
      `${stamp(50)} ERROR boom`,
    ];
    const { coverage } = selectContext(logOf(lines));

    expect(coverage.ignoredRoutine).toBe(10);
    expect(coverage.ignoredRoutineByKind['health-check']).toBe(10);
    expect(coverage.notSelected).toBeGreaterThan(20);
  });

  it('keeps a whole stack trace as one selected event', () => {
    const selection = selectContext(
      logOf([
        `${stamp(1)} ERROR Unhandled rejection`,
        "TypeError: Cannot read properties of undefined (reading 'id')",
        '    at a (/app/a.ts:1:1)',
        '    at b (/app/b.ts:2:2)',
        `${stamp(2)} INFO next`,
      ]),
    );

    expect(selection.selected[0].event.originalLineEnd).toBe(4);
    expect(selection.selected[0].event.raw).toContain('at b (/app/b.ts:2:2)');
  });

  it('keeps the order of the file', () => {
    const lines = [
      `${stamp(1)} ERROR first`,
      `${stamp(2)} INFO deployment d-1 started`,
      `${stamp(3)} WARN third`,
    ];
    const indexes = selectContext(logOf(lines)).selected.map((entry) => entry.index);

    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
  });

  it('declares a cut by budget and does not report the analysis as complete', () => {
    const lines = Array.from(
      { length: 60 },
      (_, index) => `${stamp(index)} ERROR failure ${index}`,
    );
    const { coverage, selected } = selectContext(logOf(lines), {
      ...DEFAULT_SELECTION_OPTIONS,
      maxEvents: 20,
    });

    expect(selected).toHaveLength(20);
    expect(coverage.cutByBudget).toBe(40);
    expect(coverage.complete).toBe(false);
    expect(coverage.limits.map((limit) => limit.code)).toContain('cut-by-budget');
  });

  it('declares the records it could not read', () => {
    const lines = Array.from(
      { length: 30 },
      (_, index) => `${stamp(index)} ERROR failure ${index}`,
    );
    const log = normalizeLog(lines.join('\n'), { maxEvents: 10 });
    const { coverage } = selectContext(log);

    expect(coverage.notAcquired).toBe(20);
    expect(coverage.complete).toBe(false);
    expect(coverage.limits).toContainEqual({ code: 'records-not-acquired', count: 20 });
  });

  it('keeps the events around an anomaly that sits on the edge of two blocks', () => {
    const lines = Array.from({ length: 40 }, (_, index) => `${stamp(index)} INFO tick ${index}`);
    lines[19] = `${stamp(19)} ERROR edge failure`;
    const selection = selectContext(logOf(lines), {
      ...DEFAULT_SELECTION_OPTIONS,
      chunkSize: 20,
      chunkOverlap: 5,
    });
    const messages = selection.selected.map(({ event }) => event.message);

    expect(messages).toContain('edge failure');
    expect(messages).toContain('tick 20');
    expect(messages).toContain('tick 21');
    expect(messages).toContain('tick 16');
  });

  it('selects a few events out of a noisy log of 30,000 events, quickly', () => {
    const lines = Array.from(
      { length: 30_000 },
      (_, index) => `${stamp(index)} INFO [svc-${index % 5}] request done request_id=req-${index}`,
    );
    lines[15_000] = `${stamp(0)} ERROR [svc-1] database timeout request_id=req-15000`;
    const started = performance.now();
    const selection = selectContext(logOf(lines));

    expect(selection.selected.length).toBeLessThan(20);
    expect(selection.coverage.acquiredEvents).toBe(30_000);
    expect(performance.now() - started).toBeLessThan(4000);
  });
});

describe('splitIntoChunks', () => {
  it('gives every block its own events plus the overlap of its neighbours', () => {
    const chunks = splitIntoChunks([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4, 1);

    expect(chunks.map((chunk) => [chunk.coreStart, chunk.coreEnd])).toEqual([
      [0, 4],
      [4, 8],
      [8, 10],
    ]);
    expect(chunks[1].items).toEqual([3, 4, 5, 6, 7, 8]);
    expect(chunks[1].start).toBe(3);
  });

  it('refuses a block size below one', () => {
    expect(() => splitIntoChunks([1, 2], 0, 0)).toThrow(RangeError);
  });
});
