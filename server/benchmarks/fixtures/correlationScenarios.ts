import type { Scenario } from '../scenarioTypes';

/** Logs whose difficulty is deciding what belongs together and what caused what. */

/** 2. A database goes away and the application fails because of it. */
export const databaseWithConsequences: Scenario = {
  id: 'database-error-with-consequences',
  title: 'A database error with consequences in the application',
  description:
    'Postgres shuts down; the API fails to connect and answers 500 to the requests that need it.',
  log: [
    '2026-11-04T09:00:00Z INFO  [api] request completed path=/orders status=200',
    '2026-11-04T09:10:00Z ERROR [postgres] FATAL: the database system is shutting down',
    '2026-11-04T09:10:01Z ERROR [api] query failed: connect ECONNREFUSED postgres:5432 requestId=req-71',
    '2026-11-04T09:10:02Z ERROR [api] request completed path=/orders status=500 requestId=req-71',
    '2026-11-04T09:10:05Z ERROR [api] query failed: connect ECONNREFUSED postgres:5432 requestId=req-72',
    '2026-11-04T09:10:06Z ERROR [api] request completed path=/orders status=500 requestId=req-72',
  ].join('\n'),
  expected: {
    sampleEvents: [
      { marker: 'the database system is shutting down', level: 'error', service: 'postgres' },
    ],
    relevantMarkers: [
      'the database system is shutting down',
      'connect ECONNREFUSED postgres:5432 requestId=req-71',
      'status=500 requestId=req-72',
    ],
    incidents: [
      {
        name: 'postgres-down',
        markers: [
          'the database system is shutting down',
          'connect ECONNREFUSED postgres:5432 requestId=req-71',
          'status=500 requestId=req-72',
        ],
        rootCauseMarker: 'the database system is shutting down',
        rootCauseStatus: 'probable',
        minSeverity: 'medium',
      },
    ],
  },
};

/** 7. Three problems that have nothing to do with each other. */
export const independentIncidents: Scenario = {
  id: 'independent-incidents',
  title: 'Independent incidents in one file',
  description:
    'A billing failure, a search shard outage and a brute-force login attempt, with no identifier in common.',
  log: [
    '2026-11-04T09:00:00Z ERROR [billing] invoice render failed invoice=INV-2201 reason=template_missing',
    '2026-11-04T09:20:00Z ERROR [search] index shard s4 unavailable shard=s4',
    '2026-11-04T09:40:01Z WARN  [auth] failed password for admin from 203.0.113.9',
    '2026-11-04T09:40:03Z WARN  [auth] failed password for admin from 203.0.113.9',
    '2026-11-04T09:40:05Z WARN  [auth] failed password for admin from 203.0.113.9',
    '2026-11-04T09:40:08Z WARN  [auth] failed password for admin from 203.0.113.9',
  ].join('\n'),
  expected: {
    sampleEvents: [{ marker: 'index shard s4 unavailable', level: 'error', service: 'search' }],
    relevantMarkers: [
      'invoice render failed',
      'index shard s4 unavailable',
      'failed password for admin',
    ],
    incidents: [
      {
        name: 'billing',
        markers: ['invoice render failed'],
        mustNotContainMarkers: ['index shard s4', 'failed password'],
      },
      {
        name: 'search',
        markers: ['index shard s4 unavailable'],
        mustNotContainMarkers: ['invoice render failed', 'failed password'],
      },
      {
        name: 'brute-force',
        markers: ['failed password for admin'],
        mustNotContainMarkers: ['invoice render failed', 'index shard s4'],
      },
    ],
  },
};

/** 10. A configuration change in one service makes another service fail. */
export const configDownstream: Scenario = {
  id: 'config-error-downstream',
  title: 'A configuration error causing downstream problems',
  description:
    'A rate limit is lowered from 1000 to 10; the gateway starts answering 429 and a backend that calls it gives up.',
  log: [
    '2026-11-04T10:00:00Z INFO  [gateway] request completed path=/api/items status=200',
    '2026-11-04T10:02:00Z INFO  [gateway] request completed path=/api/items status=200',
    '2026-11-04T10:05:00Z INFO  [config-service] config applied: gateway.rateLimit changed from 1000 to 10 deployment_id=d-77',
    '2026-11-04T10:05:02Z WARN  [gateway] rate limit exceeded limit=10 client=ci-runner path=/api/items status=429',
    '2026-11-04T10:05:03Z WARN  [gateway] rate limit exceeded limit=10 client=mobile-app path=/api/items status=429',
    '2026-11-04T10:05:04Z WARN  [gateway] rate limit exceeded limit=10 client=partner-api path=/api/items status=429',
    '2026-11-04T10:05:06Z ERROR [mobile-backend] call to gateway failed after retries status=429 requestId=req-88',
  ].join('\n'),
  expected: {
    sampleEvents: [
      { marker: 'config applied: gateway.rateLimit', service: 'config-service', level: 'info' },
    ],
    relevantMarkers: [
      'config applied: gateway.rateLimit',
      'rate limit exceeded limit=10 client=ci-runner',
    ],
    incidents: [
      {
        name: 'rate-limit-config',
        markers: [
          'config applied: gateway.rateLimit',
          'rate limit exceeded limit=10 client=ci-runner',
          'call to gateway failed after retries',
        ],
        rootCauseMarker: 'config applied: gateway.rateLimit',
        rootCauseStatus: 'confirmed',
      },
    ],
    forbiddenClaims: ['network', 'packet loss'],
  },
};

/** 11. An application-level conflict that is handled by a retry: not a network problem, not an outage. */
export const http409Conflict: Scenario = {
  id: 'http-409-not-network',
  title: 'An application HTTP 409 unrelated to the network',
  description:
    'Three orders hit an optimistic-locking conflict (HTTP 409) and succeed on retry. Nothing is down.',
  log: [
    '2026-11-04T10:00:00Z INFO  [checkout] order created orderId=O-31',
    '2026-11-04T10:00:01Z WARN  [checkout] inventory commit rejected status=409 orderId=O-31 reason=version_conflict',
    '2026-11-04T10:00:01Z INFO  [checkout] inventory commit ok orderId=O-31 attempt=2',
    '2026-11-04T10:01:00Z INFO  [checkout] order created orderId=O-32',
    '2026-11-04T10:01:01Z WARN  [checkout] inventory commit rejected status=409 orderId=O-32 reason=version_conflict',
    '2026-11-04T10:01:01Z INFO  [checkout] inventory commit ok orderId=O-32 attempt=2',
    '2026-11-04T10:02:00Z INFO  [checkout] order created orderId=O-33',
    '2026-11-04T10:02:01Z WARN  [checkout] inventory commit rejected status=409 orderId=O-33 reason=version_conflict',
    '2026-11-04T10:02:01Z INFO  [checkout] inventory commit ok orderId=O-33 attempt=2',
  ].join('\n'),
  expected: {
    sampleEvents: [{ marker: 'status=409 orderId=O-31', level: 'warn', service: 'checkout' }],
    relevantMarkers: ['status=409 orderId=O-31', 'status=409 orderId=O-33'],
    incidents: [
      {
        name: 'version-conflicts',
        markers: ['status=409 orderId=O-31', 'status=409 orderId=O-33'],
        rootCauseStatus: 'insufficient',
        maxSeverity: 'low',
      },
    ],
    forbiddenClaims: ['network', 'packet loss', 'connectivity', 'DNS'],
  },
};
