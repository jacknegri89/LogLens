import type { Scenario } from '../scenarioTypes';

/** Small, clear logs: the cases every analyser must get right before it is trusted with a hard one. */

/** 1. One Node.js error with its stack trace and the request that failed because of it. */
export const singleNodeError: Scenario = {
  id: 'single-node-error',
  title: 'A single Node.js error',
  description: 'One TypeError with a stack trace, and the HTTP 500 the same request received.',
  log: [
    '2026-11-04T09:00:00.000Z INFO  [api] server listening port=3000',
    '2026-11-04T09:00:12.400Z INFO  [api] request completed method=GET path=/health status=200',
    "2026-11-04T09:03:41.120Z ERROR [api] TypeError: Cannot read properties of undefined (reading 'email') requestId=req-501",
    '    at buildProfile (/srv/api/src/profile.js:58:21)',
    '    at async handler (/srv/api/src/routes/users.js:19:3)',
    '    at async layer (/srv/api/node_modules/express/lib/router/layer.js:95:5)',
    '2026-11-04T09:03:42.003Z INFO  [api] request completed method=GET path=/users/77 status=500 requestId=req-501',
  ].join('\n'),
  expected: {
    sampleEvents: [
      {
        marker: 'TypeError: Cannot read properties',
        level: 'error',
        service: 'api',
        timestamp: '2026-11-04T09:03:41.120Z',
        lineStart: 3,
        lineEnd: 6,
      },
    ],
    relevantMarkers: ['TypeError: Cannot read properties', 'status=500'],
    incidents: [
      {
        name: 'profile-type-error',
        markers: ['TypeError: Cannot read properties', 'status=500'],
        rootCauseMarker: 'TypeError: Cannot read properties',
        rootCauseStatus: 'probable',
        minSeverity: 'medium',
        maxSeverity: 'medium',
      },
    ],
  },
};

/** 3. A Java exception with a "Caused by" chain: the whole trace is one event. */
export const multilineStack: Scenario = {
  id: 'multiline-stack-trace',
  title: 'A multi-line Java stack trace',
  description:
    'An exception with a cause chain and frames, followed by a normal line. The trace must stay in one event.',
  log: [
    '2026-11-04 14:22:10,512 ERROR [http-nio-8080-exec-3] com.shop.OrderService - Failed to place order orderId=O-7001',
    'java.lang.IllegalStateException: Unable to persist order',
    '\tat com.shop.OrderRepository.save(OrderRepository.java:88)',
    '\tat com.shop.OrderService.place(OrderService.java:41)',
    '\tat com.shop.OrderController.create(OrderController.java:27)',
    'Caused by: org.postgresql.util.PSQLException: ERROR: duplicate key value violates unique constraint "orders_pkey"',
    '\tat org.postgresql.core.v3.QueryExecutorImpl.receiveErrorResponse(QueryExecutorImpl.java:2676)',
    '\t... 12 common frames omitted',
    '2026-11-04 14:22:11,004 INFO  [http-nio-8080-exec-5] com.shop.OrderService - Order placed orderId=O-7002',
  ].join('\n'),
  expected: {
    sampleEvents: [
      {
        marker: 'Failed to place order orderId=O-7001',
        level: 'error',
        timestamp: '2026-11-04T14:22:10.512Z',
        lineStart: 1,
        lineEnd: 8,
      },
      { marker: 'Order placed orderId=O-7002', level: 'info', lineStart: 9, lineEnd: 9 },
    ],
    relevantMarkers: ['Failed to place order orderId=O-7001', 'duplicate key value'],
    incidents: [
      {
        name: 'duplicate-key',
        markers: ['Failed to place order orderId=O-7001'],
        rootCauseMarker: 'Failed to place order orderId=O-7001',
        rootCauseStatus: 'probable',
        mustNotContainMarkers: ['Order placed orderId=O-7002'],
      },
    ],
  },
};

/** 8. A log where everything works: the right answer is no incident at all. */
export const healthyLog: Scenario = {
  id: 'healthy-log',
  title: 'A log without real errors',
  description: 'Startup, requests, health checks and a normal deployment. Nothing is wrong.',
  log: [
    '2026-11-04T08:00:00Z INFO  [api] server started version=2026.11.4 port=3000',
    '2026-11-04T08:00:05Z INFO  [api] connected to database host=db-1',
    '2026-11-04T08:00:10Z INFO  [api] request completed method=GET path=/orders status=200 durationMs=34',
    '2026-11-04T08:00:15Z INFO  [api] request completed method=POST path=/orders status=201 durationMs=88',
    '2026-11-04T08:00:20Z INFO  [worker] job completed name=daily-report durationMs=1204',
    '2026-11-04T08:00:25Z INFO  [api] request completed method=GET path=/orders/55 status=304 durationMs=12',
  ].join('\n'),
  expected: {
    sampleEvents: [{ marker: 'job completed name=daily-report', level: 'info', service: 'worker' }],
    relevantMarkers: [],
    incidents: [],
  },
};

/** 14. Failures that repeat but say nothing about why: the honest answer is "not enough information". */
export const insufficientData: Scenario = {
  id: 'insufficient-data',
  title: 'Missing data prevents a certain conclusion',
  description:
    'A job fails three times with no message, no identifier and no other service in the log.',
  log: [
    '2026-11-04T08:00:03Z ERROR [worker] job failed',
    '2026-11-04T08:00:04Z ERROR [worker] job failed',
    '2026-11-04T08:10:09Z ERROR [worker] job failed',
  ].join('\n'),
  expected: {
    sampleEvents: [{ marker: 'job failed', level: 'error', service: 'worker' }],
    relevantMarkers: ['job failed'],
    incidents: [
      {
        name: 'unexplained-job-failures',
        markers: ['job failed'],
        rootCauseStatus: 'insufficient',
        maxSeverity: 'medium',
      },
    ],
    insufficientInformation: true,
    forbiddenClaims: ['network', 'database', 'memory'],
  },
};
