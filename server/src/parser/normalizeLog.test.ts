import { describe, expect, it } from 'vitest';

import { normalizedLogEventSchema } from './normalizedEvent';
import { normalizeLog } from './normalizeLog';

function firstEvent(log: string) {
  return normalizeLog(log).events[0];
}

describe('application logs with a time, a level and key=value pairs', () => {
  it('reads time, level, service, identifiers and message', () => {
    const event = firstEvent(
      '2026-11-03T14:02:00.112Z ERROR [checkout] payment failed orderId=O-1001 request_id=req-7a1 status=409',
    );

    expect(event.timestamp).toBe('2026-11-03T14:02:00.112Z');
    expect(event.timestampConfidence).toBe('exact');
    expect(event.level).toBe('error');
    expect(event.service).toBe('checkout');
    expect(event.orderId).toBe('O-1001');
    expect(event.requestId).toBe('req-7a1');
    expect(event.statusCode).toBe(409);
    expect(event.message).toContain('payment failed');
    expect(event.parseStatus).toBe('parsed');
  });

  it('keeps a numeric order id as text', () => {
    expect(firstEvent('2026-11-03 10:00:00 INFO order_id=1001 created').orderId).toBe('1001');
  });

  it('finds identifiers written in words', () => {
    const event = firstEvent(
      '2026-11-03T10:00:00Z INFO Payment confirmed for order O-2002, request id: req-55',
    );

    expect(event.orderId).toBe('O-2002');
    expect(event.requestId).toBe('req-55');
  });

  it('reads a W3C traceparent', () => {
    const event = firstEvent(
      '2026-11-03T10:00:00Z INFO call traceparent=00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    );

    expect(event.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(event.spanId).toBe('00f067aa0ba902b7');
  });
});

describe('timestamps and time zones', () => {
  it('turns different offsets into the same UTC instant', () => {
    const { events } = normalizeLog(
      [
        '2026-11-03T15:00:00+01:00 INFO a',
        '2026-11-03T14:00:00Z INFO b',
        '2026-11-03T09:00:00-05:00 INFO c',
      ].join('\n'),
    );

    expect(new Set(events.map((event) => event.timestamp)).size).toBe(1);
    expect(events.every((event) => event.timestampConfidence === 'exact')).toBe(true);
  });

  it('marks a time without a zone as assumed, and a bare clock as partial', () => {
    const { events } = normalizeLog('2026-11-03 14:02:00 INFO a\n14:02:01 INFO b');

    expect(events[0].timestampConfidence).toBe('assumed');
    expect(events[1].timestampConfidence).toBe('partial');
    expect(events[1].timestamp).toBeNull();
  });

  it('uses the zone it is told to assume', () => {
    const log = '2026-11-03 14:02:00 INFO a';
    const event = normalizeLog(log, { timestamp: { defaultOffsetMinutes: 60 } }).events[0];

    expect(event.timestamp).toBe('2026-11-03T13:02:00.000Z');
  });

  it('keeps the order of the file even when the times are out of order', () => {
    const { events } = normalizeLog(
      '2026-11-03T14:00:05Z INFO late\n2026-11-03T14:00:01Z INFO early',
    );

    expect(events.map((event) => event.message)).toEqual(['late', 'early']);
    expect(events[0].originalLineStart).toBe(1);
  });

  it('reads Unix times in seconds and in milliseconds', () => {
    const { events } = normalizeLog(
      ['{"time":1793541720,"msg":"seconds"}', '{"ts":1793541720123,"msg":"millis"}'].join('\n'),
    );

    expect(events[0].timestamp).toBe('2026-11-01T14:02:00.000Z');
    expect(events[1].timestamp).toBe('2026-11-01T14:02:00.123Z');
    expect(events[0].timestampConfidence).toBe('exact');
  });

  it('rejects an impossible date instead of inventing a time', () => {
    const event = firstEvent('2026-13-45T25:61:00Z INFO impossible');

    expect(event.timestamp).toBeNull();
  });
});

describe('JSON lines', () => {
  it('reads a structured event by meaning, not by key name', () => {
    const event = firstEvent(
      '{"@timestamp":"2026-11-03T14:02:00+01:00","severity":"warning","message":"slow query","service":"api","trace_id":"abc123","http":{"status_code":503}}',
    );

    expect(event.format).toBe('json');
    expect(event.timestamp).toBe('2026-11-03T13:02:00.000Z');
    expect(event.level).toBe('warn');
    expect(event.service).toBe('api');
    expect(event.traceId).toBe('abc123');
    expect(event.statusCode).toBe(503);
  });

  it('maps numeric pino levels', () => {
    expect(firstEvent('{"level":50,"msg":"boom"}').level).toBe('error');
    expect(firstEvent('{"level":30,"msg":"hi"}').level).toBe('info');
  });
});

describe('syslog', () => {
  it('reads the classic format with its host and program', () => {
    const event = firstEvent(
      'Nov  3 14:02:00 web1 sshd[812]: Failed password for root from 10.0.0.5',
    );

    expect(event.format).toBe('syslog');
    expect(event.host).toBe('web1');
    expect(event.service).toBe('sshd');
    expect(event.attributes.pid).toBe(812);
    expect(event.timestampConfidence).toBe('partial');
  });

  it('reads RFC 5424 with its priority', () => {
    const event = firstEvent(
      '<163>1 2026-11-03T14:02:00.003Z web1 billing 77 ID47 - invoice failed',
    );

    expect(event.format).toBe('syslog');
    expect(event.level).toBe('error');
    expect(event.service).toBe('billing');
    expect(event.timestamp).toBe('2026-11-03T14:02:00.003Z');
  });
});

describe('web servers', () => {
  it('reads an nginx access line, with the status deciding the level', () => {
    const event = firstEvent(
      '10.0.0.5 - - [03/Nov/2026:14:02:00 +0100] "GET /api/orders HTTP/1.1" 502 157 "-" "curl/8.4"',
    );

    expect(event.format).toBe('access-log');
    expect(event.statusCode).toBe(502);
    expect(event.level).toBe('error');
    expect(event.timestamp).toBe('2026-11-03T13:02:00.000Z');
    expect(event.attributes.clientIp).toBe('10.0.0.5');
  });

  it('reads an nginx error line with its upstream', () => {
    const event = firstEvent(
      '2026/11/03 14:02:00 [error] 1234#0: *5 upstream timed out (110: Connection timed out) while reading response header from upstream, client: 1.2.3.4, server: shop.example, request: "GET /api HTTP/1.1", upstream: "http://10.0.0.8:3000/api"',
    );

    expect(event.format).toBe('nginx-error');
    expect(event.level).toBe('error');
    expect(event.service).toBe('nginx');
    expect(event.attributes.upstream).toBe('http://10.0.0.8:3000/api');
  });
});

describe('stack traces', () => {
  it('keeps a Node.js exception with its frames as one event', () => {
    const { events } = normalizeLog(
      [
        '2026-11-03T14:02:00.104Z ERROR Unhandled promise rejection in request handler',
        "TypeError: Cannot read properties of undefined (reading 'map')",
        '    at buildReport (/app/src/report.ts:42:28)',
        '    at async handler (/app/src/handler.ts:10:5)',
        '2026-11-03T14:02:01.000Z INFO next request',
      ].join('\n'),
    );

    expect(events).toHaveLength(2);
    expect(events[0].originalLineStart).toBe(1);
    expect(events[0].originalLineEnd).toBe(4);
    expect(events[0].attributes.exceptionClass).toBe('TypeError');
    expect(events[0].attributes.topFrame).toContain('report.ts:42:28');
    expect(events[0].raw).toContain('at async handler');
  });

  it('keeps a Python traceback and its final line as one event', () => {
    const { events } = normalizeLog(
      [
        'Traceback (most recent call last):',
        '  File "app.py", line 12, in <module>',
        '    main()',
        '  File "app.py", line 8, in main',
        '    int("x")',
        "ValueError: invalid literal for int() with base 10: 'x'",
      ].join('\n'),
    );

    expect(events).toHaveLength(1);
    expect(events[0].attributes.exceptionClass).toBe('ValueError');
    expect(events[0].attributes.topFrame).toBe('app.py:8');
    expect(events[0].level).toBe('error');
  });

  it('finds the root cause of a Java chain', () => {
    const { events } = normalizeLog(
      [
        '2026-11-03 14:02:00,104 ERROR [main] c.a.OrderService - failed to save',
        'org.springframework.dao.DataAccessResourceFailureException: could not open connection',
        '\tat org.springframework.jdbc.Foo.bar(Foo.java:10)',
        'Caused by: java.net.ConnectException: Connection refused',
        '\tat java.base/sun.nio.ch.Net.connect(Net.java:579)',
        '\t... 12 more',
      ].join('\n'),
    );

    expect(events).toHaveLength(1);
    expect(events[0].attributes.rootCause).toBe('java.net.ConnectException: Connection refused');
  });
});

describe('databases', () => {
  it('reads PostgreSQL with its user, its database and its detail lines', () => {
    const { events } = normalizeLog(
      [
        '2026-11-03 14:02:00.123 UTC [1234] app@shop ERROR:  duplicate key value violates unique constraint "orders_pkey"',
        '\tDETAIL:  Key (id)=(5) already exists.',
      ].join('\n'),
    );

    expect(events).toHaveLength(1);
    expect(events[0].format).toBe('postgres');
    expect(events[0].level).toBe('error');
    expect(events[0].attributes.database).toBe('shop');
    expect(events[0].message).toContain('already exists');
  });

  it('reads MySQL with its error code', () => {
    const event = firstEvent(
      '2026-11-03T14:02:00.123456Z 12 [Warning] [MY-010055] [Server] IP address could not be resolved',
    );

    expect(event.format).toBe('mysql');
    expect(event.level).toBe('warn');
    expect(event.errorCode).toBe('MY-010055');
  });
});

describe('Kubernetes, Docker and Windows', () => {
  it('reads a klog line', () => {
    const event = firstEvent('E1103 14:02:00.123456       1 reflector.go:138] failed to watch');

    expect(event.format).toBe('klog');
    expect(event.level).toBe('error');
  });

  it('reads a Docker line with a container stream marker', () => {
    const event = firstEvent('2026-11-03T14:02:00.123456789Z stderr F ERROR connection lost');

    expect(event.level).toBe('error');
    expect(event.timestampConfidence).toBe('exact');
  });

  it('reads a Windows event written as XML, over several lines', () => {
    const { events } = normalizeLog(
      [
        "<Event xmlns='http://schemas.microsoft.com/win/2004/08/events/event'>",
        "<System><Provider Name='Microsoft-Windows-Security-Auditing'/><EventID>4625</EventID>",
        "<Level>2</Level><TimeCreated SystemTime='2026-11-03T14:02:00.1234567Z'/>",
        '<Computer>DC01</Computer></System>',
        "<EventData><Data Name='TargetUserName'>alice</Data></EventData>",
        '</Event>',
      ].join('\n'),
    );

    expect(events).toHaveLength(1);
    expect(events[0].format).toBe('windows-event');
    expect(events[0].level).toBe('error');
    expect(events[0].host).toBe('DC01');
    expect(events[0].attributes.eventId).toBe(4625);
    expect(events[0].attributes.TargetUserName).toBe('alice');
    expect(events[0].timestamp).toBe('2026-11-03T14:02:00.123Z');
  });
});

describe('mixed and damaged logs', () => {
  const MIXED = [
    '{"ts":"2026-11-03T14:02:00Z","level":"info","msg":"start","service":"api"}',
    '10.0.0.5 - - [03/Nov/2026:15:02:01 +0100] "GET /health HTTP/1.1" 200 2 "-" "kube-probe"',
    '{"ts": broken json',
    '2026-11-03T14:02:03Z ERROR [api] database timeout',
    '',
    'just some text nobody knows how to read',
  ].join('\n');

  it('reads each record in its own format', () => {
    const { formats } = normalizeLog(MIXED);

    expect(formats.json).toBe(1);
    expect(formats['access-log']).toBe(1);
    expect(formats.generic).toBe(1);
  });

  it('keeps the lines it cannot read as unparsed events', () => {
    const { events } = normalizeLog(MIXED);
    const unreadable = events.filter((event) => event.parseStatus === 'unparsed');

    expect(unreadable.map((event) => event.raw)).toContain(
      'just some text nobody knows how to read',
    );
  });

  it('covers every non-empty line exactly once, with its original line number', () => {
    const { events } = normalizeLog(MIXED);
    const covered = events.flatMap((event) =>
      Array.from(
        { length: event.originalLineEnd - event.originalLineStart + 1 },
        (_, offset) => event.originalLineStart + offset,
      ),
    );

    expect(covered).toEqual([1, 2, 3, 4, 6]);
  });

  it('survives a line of 100,000 characters and binary noise', () => {
    const huge = `2026-11-03T14:02:00Z ERROR ${'x'.repeat(100_000)}`;
    const { events } = normalizeLog(`${huge}\n\u0000\u0001\u0002 garbage\nINFO fine`);

    expect(events).toHaveLength(3);
    expect(events[0].message.length).toBeLessThanOrEqual(2000);
    expect(events[0].raw.length).toBe(huge.length);
    expect(events[2].level).toBe('info');
  });

  it('produces events that satisfy the event schema', () => {
    for (const event of normalizeLog(MIXED).events) {
      expect(normalizedLogEventSchema.safeParse(event).success).toBe(true);
    }
  });

  it('counts the records it did not read when the log is larger than the limit', () => {
    const lines = Array.from(
      { length: 30 },
      (_, index) => `2026-11-03T14:02:${String(index).padStart(2, '0')}Z INFO line ${index}`,
    );
    const result = normalizeLog(lines.join('\n'), { maxEvents: 10 });

    expect(result.events).toHaveLength(10);
    expect(result.totalRecords).toBe(30);
    expect(result.notAcquiredRecords).toBe(20);
  });

  it('is fast on a large noisy log', () => {
    const lines = Array.from(
      { length: 20_000 },
      (_, index) =>
        `2026-11-03T14:${String(Math.floor(index / 60) % 60).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}Z INFO [svc-${index % 7}] request done request_id=req-${index}`,
    );
    const started = performance.now();
    const { events } = normalizeLog(lines.join('\n'));

    expect(events).toHaveLength(20_000);
    expect(performance.now() - started).toBeLessThan(3000);
  });
});
