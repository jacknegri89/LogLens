import type { Scenario } from '../scenarioTypes';

/**
 * A deployment changes a configuration value, and the failures appear in other services.
 *
 * The log is what an engineer gets by merging the files of several services: five formats, two
 * time zones, lines that arrive late, health checks every few seconds and an unrelated problem in
 * the middle. Nothing in it says "the TTL change caused this": that has to be worked out from the
 * identifiers, the values and the order of the events.
 */

const DAY = '2026-11-04';
const FAST_ORDERS_BEFORE_CHANGE = 12;
/** The orders that arrive after the change, and which of them take longer than the new TTL. */
const AFTER_CHANGE_ORDERS = [
  { id: 'O-1101', slow: true },
  { id: 'O-1102', slow: true },
  { id: 'O-1103', slow: true },
  { id: 'O-1104', slow: false },
  { id: 'O-1105', slow: true },
  { id: 'O-1106', slow: true },
  { id: 'O-1107', slow: false },
  { id: 'O-1108', slow: false },
];

interface TimedLine {
  /** Seconds after 10:00:00 UTC when the event happened. */
  at: number;
  /** Seconds the line is late in the file: a service whose log arrives after the others. */
  delay: number;
  text: string;
}

function clock(seconds: number): string {
  const total = Math.floor(seconds);
  const millis = Math.round((seconds - total) * 1000);
  const hours = 10 + Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (value: number, size = 2) => String(value).padStart(size, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}.${pad(millis, 3)}`;
}

function iso(seconds: number): string {
  return `${DAY}T${clock(seconds)}Z`;
}

function textLine(
  seconds: number,
  level: string,
  service: string,
  body: string,
  delay = 0,
): TimedLine {
  return { at: seconds, delay, text: `${iso(seconds)} ${level.padEnd(5)} [${service}] ${body}` };
}

function jsonLine(
  seconds: number,
  level: string,
  service: string,
  message: string,
  fields: Record<string, string>,
): TimedLine {
  const object = { ts: iso(seconds), level, service, msg: message, ...fields };
  return { at: seconds, delay: 0, text: JSON.stringify(object) };
}

/** The gateway writes nginx access lines in its own time zone, one hour ahead of UTC. */
function gatewayLine(seconds: number, request: string, status: number): TimedLine {
  const total = Math.floor(seconds);
  const local = `${DAY.slice(8, 10)}/Nov/2026:${String(11 + Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')} +0100`;
  return {
    at: seconds,
    delay: 0,
    text: `10.0.0.5 - - [${local}] "${request} HTTP/1.1" ${status} 12 "-" "kube-probe/1.29"`,
  };
}

function storageTimeout(seconds: number, index: number): TimedLine {
  const total = Math.floor(seconds);
  const stamp = `Nov  4 10:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  return {
    at: seconds,
    delay: 0,
    text: `${stamp} storage-1 storage[221]: upload timeout key=reports/daily-${String(index).padStart(4, '0')}.csv after 30000ms`,
  };
}

function successfulOrder(
  orderId: string,
  start: number,
  ttlMs: number,
  requestNumber: number,
): TimedLine[] {
  const reservationId = `R-${orderId.slice(2)}`;
  const requestId = `req-${requestNumber}`;
  return [
    textLine(start, 'INFO', 'checkout', `order created orderId=${orderId} request_id=${requestId}`),
    textLine(
      start + 0.1,
      'INFO',
      'inventory',
      `reservation created reservationId=${reservationId} orderId=${orderId} ttlMs=${ttlMs}`,
    ),
    textLine(
      start + 0.6,
      'INFO',
      'payment',
      `payment confirmed orderId=${orderId} amount=49.90 currency=EUR request_id=${requestId}`,
    ),
    textLine(
      start + 0.7,
      'INFO',
      'checkout',
      `order paid orderId=${orderId} request_id=${requestId}`,
    ),
    textLine(
      start + 0.8,
      'INFO',
      'fulfillment',
      `fulfillment completed orderId=${orderId} reservationId=${reservationId}`,
      6,
    ),
  ];
}

function brokenOrder(
  orderId: string,
  start: number,
  requestNumber: number,
  withStack: boolean,
): TimedLine[] {
  const reservationId = `R-${orderId.slice(2)}`;
  const requestId = `req-${requestNumber}`;
  const lines = [
    textLine(start, 'INFO', 'checkout', `order created orderId=${orderId} request_id=${requestId}`),
    textLine(
      start + 0.1,
      'INFO',
      'inventory',
      `reservation created reservationId=${reservationId} orderId=${orderId} ttlMs=900`,
    ),
    textLine(
      start + 1.2,
      'WARN',
      'inventory',
      `reservation expired reservationId=${reservationId} orderId=${orderId} ageMs=1100 ttlMs=900`,
    ),
    textLine(
      start + 1.3,
      'WARN',
      'checkout',
      `inventory commit rejected status=409 orderId=${orderId} reservationId=${reservationId} request_id=${requestId}`,
    ),
    textLine(
      start + 1.4,
      'INFO',
      'payment',
      `payment confirmed orderId=${orderId} amount=49.90 currency=EUR request_id=${requestId}`,
    ),
  ];
  const failure = textLine(
    start + 1.6,
    'ERROR',
    'fulfillment',
    `failed to fulfill order orderId=${orderId} reservationId=${reservationId} reason=reservation_not_found`,
    6,
  );
  if (withStack) {
    failure.text += [
      '',
      'Error: reservation not found',
      '    at ReservationClient.get (/srv/fulfillment/src/reservationClient.js:44:11)',
      '    at async fulfill (/srv/fulfillment/src/fulfill.js:21:5)',
    ].join('\n');
  }
  return [...lines, failure];
}

function buildLines(): TimedLine[] {
  const lines: TimedLine[] = [];
  for (let index = 0; index < FAST_ORDERS_BEFORE_CHANGE; index += 1) {
    const orderId = `O-${1001 + index}`;
    lines.push(...successfulOrder(orderId, 5 + index * 8, 900_000, 1001 + index));
  }
  lines.push(
    jsonLine(120, 'info', 'deploy-controller', 'deployment started', {
      deployment_id: 'd-381',
      version: '2026.11.4-rc2',
    }),
    jsonLine(
      124,
      'info',
      'config-service',
      'config reload applied: reservation.ttlMs changed from 900000 to 900',
      { deployment_id: 'd-381', key: 'reservation.ttlMs' },
    ),
    jsonLine(126, 'info', 'deploy-controller', 'deployment completed', {
      deployment_id: 'd-381',
      version: '2026.11.4-rc2',
    }),
  );
  AFTER_CHANGE_ORDERS.forEach(({ id, slow }, index) => {
    const start = 140 + index * 20;
    if (slow) {
      lines.push(...brokenOrder(id, start, 1101 + index, id === 'O-1103'));
      return;
    }
    lines.push(...successfulOrder(id, start, 900, 1101 + index));
  });
  for (let index = 0; index < 6; index += 1) {
    lines.push(storageTimeout(150 + index * 37, index + 1));
  }
  for (let tick = 0; tick < 70; tick += 1) {
    lines.push(gatewayLine(tick * 5, 'GET /healthz', 200));
  }
  for (let tick = 0; tick < 6; tick += 1) {
    lines.push(gatewayLine(30 + tick * 41, 'GET /static/app.js', 200));
  }
  return lines;
}

/** The file order of a merged log: by arrival time, so a service that logs late appears late. */
function mergeLines(lines: TimedLine[]): string {
  return [...lines]
    .sort((a, b) => a.at + a.delay - (b.at + b.delay))
    .map((line) => line.text)
    .join('\n');
}

export const ttlRegression: Scenario = {
  id: 'ttl-regression',
  title: 'A deployment shortens a reservation TTL',
  description:
    'A configuration reload cuts the reservation TTL from 900000 ms to 900 ms. Reservations expire early, checkout gets HTTP 409, fulfillment fails and five orders end up paid but not fulfilled, while unrelated storage timeouts fill the same log.',
  log: mergeLines(buildLines()),
  expected: {
    sampleEvents: [
      {
        marker: 'config reload applied',
        service: 'config-service',
        level: 'info',
        timestamp: `${DAY}T10:02:04.000Z`,
        format: 'json',
      },
      {
        marker: 'failed to fulfill order orderId=O-1101',
        service: 'fulfillment',
        level: 'error',
        timestamp: `${DAY}T10:02:21.600Z`,
        format: 'generic',
      },
      { marker: 'upload timeout key=reports/daily-0001.csv', service: 'storage', format: 'syslog' },
    ],
    relevantMarkers: [
      'config reload applied',
      'deployment started',
      'reservation expired reservationId=R-1101',
      'inventory commit rejected status=409 orderId=O-1101',
      'failed to fulfill order orderId=O-1101',
      'failed to fulfill order orderId=O-1105',
      'payment confirmed orderId=O-1105',
      'upload timeout key=reports/daily-0001.csv',
    ],
    incidents: [
      {
        name: 'ttl-regression',
        markers: [
          'config reload applied',
          'reservation expired reservationId=R-1101',
          'inventory commit rejected status=409 orderId=O-1101',
          'failed to fulfill order orderId=O-1101',
          'failed to fulfill order orderId=O-1105',
        ],
        rootCauseMarker: 'config reload applied',
        rootCauseStatus: 'confirmed',
        affectedEntities: ['O-1101', 'O-1102', 'O-1103', 'O-1105', 'O-1106'],
      },
      {
        name: 'storage-timeouts',
        markers: [
          'upload timeout key=reports/daily-0001.csv',
          'upload timeout key=reports/daily-0006.csv',
        ],
        rootCauseStatus: 'insufficient',
        mustNotContainMarkers: ['config reload applied', 'failed to fulfill order'],
      },
    ],
    forbiddenClaims: ['packet loss', 'network partition', 'DNS'],
  },
};
