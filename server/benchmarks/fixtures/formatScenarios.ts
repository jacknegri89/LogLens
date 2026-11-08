import type { Scenario } from '../scenarioTypes';

/** Logs whose difficulty is the format: mixed sources, shuffled order, time zones, damaged lines. */

/** 4. JSON lines from the application and nginx access lines from the proxy, in one file. */
export const mixedJsonAndNginx: Scenario = {
  id: 'mixed-json-nginx',
  title: 'JSON lines and Nginx access lines in one file',
  description:
    'An application writes JSON, its proxy writes the combined access format. One payment fails.',
  log: [
    '{"ts":"2026-11-04T11:00:00Z","level":"info","service":"orders","msg":"order accepted","order_id":"O-5001"}',
    '10.0.0.8 - - [04/Nov/2026:11:00:01 +0000] "POST /orders HTTP/1.1" 201 54 "-" "Mozilla/5.0"',
    '{"ts":"2026-11-04T11:00:09Z","level":"error","service":"payments","msg":"card declined by issuer","order_id":"O-5002","code":"card_declined"}',
    '10.0.0.8 - - [04/Nov/2026:11:00:10 +0000] "GET /orders/O-5001 HTTP/1.1" 200 410 "-" "Mozilla/5.0"',
    '10.0.0.9 - - [04/Nov/2026:11:00:12 +0000] "GET /static/app.css HTTP/1.1" 304 0 "-" "Mozilla/5.0"',
  ].join('\n'),
  expected: {
    sampleEvents: [
      {
        marker: 'card declined by issuer',
        level: 'error',
        service: 'payments',
        timestamp: '2026-11-04T11:00:09.000Z',
        format: 'json',
      },
      {
        marker: 'POST /orders HTTP/1.1',
        timestamp: '2026-11-04T11:00:01.000Z',
        format: 'access-log',
      },
    ],
    relevantMarkers: ['card declined by issuer'],
    incidents: [
      {
        name: 'card-declined',
        markers: ['card declined by issuer'],
        mustNotContainMarkers: ['GET /static/app.css'],
        maxSeverity: 'medium',
      },
    ],
  },
};

/** 5. The file is not in time order; the cause is written after its effects. */
export const outOfOrder: Scenario = {
  id: 'out-of-order-timestamps',
  title: 'Out-of-order timestamps',
  description:
    'A merged log where the line that enables a feature flag appears after the first failures it caused.',
  log: [
    '2026-11-04T10:05:30Z ERROR [checkout] order submit failed code=flag_required orderId=O-61',
    '2026-11-04T10:05:10Z INFO  [flags] feature flag checkout.v2 enabled for all users deployment_id=d-5',
    '2026-11-04T10:05:31Z ERROR [checkout] order submit failed code=flag_required orderId=O-62',
    '2026-11-04T10:05:40Z ERROR [checkout] order submit failed code=flag_required orderId=O-63',
  ].join('\n'),
  expected: {
    sampleEvents: [
      { marker: 'feature flag checkout.v2 enabled', timestamp: '2026-11-04T10:05:10.000Z' },
    ],
    relevantMarkers: [
      'feature flag checkout.v2 enabled',
      'order submit failed code=flag_required orderId=O-61',
    ],
    incidents: [
      {
        name: 'flag-regression',
        markers: [
          'feature flag checkout.v2 enabled',
          'order submit failed code=flag_required orderId=O-61',
          'order submit failed code=flag_required orderId=O-63',
        ],
        rootCauseMarker: 'feature flag checkout.v2 enabled',
        rootCauseStatus: 'probable',
        affectedEntities: ['O-61', 'O-62', 'O-63'],
      },
    ],
  },
};

/** 6. Three services write the same minute in three different time zones. */
export const differentTimezones: Scenario = {
  id: 'different-timezones',
  title: 'Events in different time zones',
  description:
    'The gateway logs in UTC, the billing service in UTC+2 and the mailer in UTC-5; the failure order only makes sense in UTC.',
  log: [
    '2026-11-04T12:00:05+02:00 INFO  [billing] invoice created invoiceId=INV-910',
    '2026-11-04T05:00:30-05:00 ERROR [mailer] smtp send failed invoiceId=INV-910 reason=connection_refused',
    '2026-11-04T10:00:20Z INFO [gateway] request completed path=/invoices status=200',
  ].join('\n'),
  expected: {
    sampleEvents: [
      { marker: 'invoice created invoiceId=INV-910', timestamp: '2026-11-04T10:00:05.000Z' },
      { marker: 'smtp send failed', timestamp: '2026-11-04T10:00:30.000Z', level: 'error' },
      { marker: 'request completed path=/invoices', timestamp: '2026-11-04T10:00:20.000Z' },
    ],
    relevantMarkers: ['smtp send failed invoiceId=INV-910'],
    incidents: [
      {
        name: 'mail-failure',
        markers: ['smtp send failed invoiceId=INV-910'],
        maxSeverity: 'medium',
      },
    ],
  },
};

/** 13. Garbage between good lines: nothing may be lost and nothing may crash. */
export const partiallyMalformed: Scenario = {
  id: 'partially-malformed',
  title: 'A partially malformed file',
  description:
    'Binary noise, a truncated JSON line and an impossible date sit between valid lines; the disk error is real.',
  log: [
    '2026-11-04T10:00:00Z INFO  [api] request completed path=/save status=200',
    '\u0000\u0001\u0002 �� garbage bytes ~~~',
    '{"level":"error","msg":"truncated json line',
    '2026-13-45T99:99:99Z INFO  [api] heartbeat with a date that cannot exist',
    '2026-11-04T10:00:07Z ERROR [api] disk write failed path=/var/data/out.bin code=ENOSPC requestId=req-41',
    '2026-11-04T10:00:08Z INFO  [api] request completed path=/save status=500 requestId=req-41',
  ].join('\n'),
  expected: {
    sampleEvents: [
      {
        marker: 'disk write failed path=/var/data/out.bin',
        level: 'error',
        timestamp: '2026-11-04T10:00:07.000Z',
        lineStart: 5,
        lineEnd: 5,
      },
    ],
    relevantMarkers: ['disk write failed path=/var/data/out.bin'],
    incidents: [
      {
        name: 'disk-full',
        markers: ['disk write failed path=/var/data/out.bin', 'status=500 requestId=req-41'],
        mustNotContainMarkers: ['truncated json line', 'garbage bytes'],
      },
      {
        // The cut line still says it is an error: it is kept as an incident nobody can diagnose.
        name: 'truncated-error-line',
        markers: ['truncated json line'],
        rootCauseStatus: 'insufficient',
        mustNotContainMarkers: ['disk write failed'],
      },
    ],
  },
};
