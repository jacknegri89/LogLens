import type { AttributeValue, LogLevel, NormalizedLogEvent } from './normalizedEvent';

/**
 * The names that logs use for the same thing. A field is looked up by its key with the
 * punctuation and the case removed ("trace_id", "traceId" and "trace-id" are all "traceid"),
 * so a new spelling is one more word in a list and not one more regular expression.
 */

export function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

type EventField =
  | 'service'
  | 'host'
  | 'level'
  | 'message'
  | 'timestamp'
  | 'traceId'
  | 'spanId'
  | 'requestId'
  | 'sessionId'
  | 'userId'
  | 'orderId'
  | 'statusCode'
  | 'errorCode'
  | 'transactionId'
  | 'deploymentId'
  | 'configId'
  | 'jobId';

const ALIASES: Record<EventField, string[]> = {
  service: [
    'service',
    'servicename',
    'svc',
    'app',
    'appname',
    'application',
    'component',
    'container',
  ],
  host: ['host', 'hostname', 'node', 'nodename', 'pod', 'podname', 'instance'],
  level: ['level', 'lvl', 'severity', 'loglevel', 'severitytext'],
  message: ['message', 'msg', 'event', 'text', 'log', 'body'],
  timestamp: [
    'timestamp',
    'time',
    'ts',
    'datetime',
    'date',
    'asctime',
    'eventtime',
    't',
    'realtimetimestamp',
  ],
  traceId: ['traceid', 'xtraceid', 'xb3traceid', 'dttraceid', 'oteltraceid'],
  spanId: ['spanid', 'xspanid', 'xb3spanid'],
  requestId: [
    'requestid',
    'reqid',
    'xrequestid',
    'correlationid',
    'xcorrelationid',
    'httprequestid',
  ],
  sessionId: ['sessionid', 'sid', 'session', 'xsessionid'],
  userId: ['userid', 'uid', 'user', 'username', 'customerid', 'accountid'],
  orderId: ['orderid', 'order', 'ordernumber', 'ordernum', 'orderref'],
  statusCode: ['status', 'statuscode', 'httpstatus', 'responsecode', 'httpstatuscode'],
  errorCode: ['errorcode', 'errno', 'sqlstate', 'errcode', 'exitcode'],
  transactionId: ['transactionid', 'txid', 'txnid', 'transaction', 'xtransactionid', 'paymentid'],
  deploymentId: [
    'deploymentid',
    'deployid',
    'deploy',
    'deployment',
    'rolloutid',
    'releaseid',
    'release',
  ],
  configId: ['configid', 'configversion', 'confighash', 'configrevision'],
  jobId: ['jobid', 'job', 'taskid', 'workflowid', 'runid', 'batchid'],
};

const FIELD_BY_KEY: Map<string, EventField> = buildLookup();

function buildLookup(): Map<string, EventField> {
  const lookup = new Map<string, EventField>();
  for (const [field, words] of Object.entries(ALIASES) as [EventField, string[]][]) {
    for (const word of words) {
      if (!lookup.has(word)) {
        lookup.set(word, field);
      }
    }
  }
  return lookup;
}

/** Which field a key names, trying the whole key first and then its last dotted part. */
export function fieldOfKey(key: string): EventField | null {
  const whole = FIELD_BY_KEY.get(normaliseKey(key));
  if (whole) {
    return whole;
  }
  const lastPart = key.split(/[.:/]/).pop() ?? key;
  return FIELD_BY_KEY.get(normaliseKey(lastPart)) ?? null;
}

const LEVEL_WORDS: Record<string, LogLevel> = {
  trace: 'trace',
  verbose: 'trace',
  debug: 'debug',
  dbg: 'debug',
  info: 'info',
  information: 'info',
  notice: 'info',
  log: 'info',
  warn: 'warn',
  warning: 'warn',
  error: 'error',
  err: 'error',
  severe: 'error',
  fail: 'error',
  failure: 'error',
  fatal: 'fatal',
  critical: 'fatal',
  crit: 'fatal',
  alert: 'fatal',
  emerg: 'fatal',
  emergency: 'fatal',
  panic: 'fatal',
};

/** Syslog numeric severities: 0 emergency ... 7 debug. */
const SYSLOG_SEVERITY: LogLevel[] = [
  'fatal',
  'fatal',
  'fatal',
  'error',
  'warn',
  'info',
  'info',
  'debug',
];

/** A level word ("WARNING", "err", "critical"), a syslog number or a numeric Bunyan/pino level. */
export function normaliseLevel(value: unknown): LogLevel {
  if (typeof value === 'number') {
    return levelFromNumber(value);
  }
  if (typeof value !== 'string') {
    return 'unknown';
  }
  const text = value.trim().toLowerCase();
  const known = LEVEL_WORDS[text];
  if (known) {
    return known;
  }
  if (/^\d{1,2}$/.test(text)) {
    return levelFromNumber(Number(text));
  }
  return 'unknown';
}

/** Pino and Bunyan use 10 to 60; syslog uses 0 to 7. The ranges do not overlap. */
function levelFromNumber(value: number): LogLevel {
  if (value >= 10) {
    return levelFromPino(value);
  }
  return SYSLOG_SEVERITY[value] ?? 'unknown';
}

function levelFromPino(value: number): LogLevel {
  if (value >= 60) {
    return 'fatal';
  }
  if (value >= 50) {
    return 'error';
  }
  if (value >= 40) {
    return 'warn';
  }
  if (value >= 30) {
    return 'info';
  }
  if (value >= 20) {
    return 'debug';
  }
  return 'trace';
}

/** The HTTP status in a value, when the value is a number between 100 and 599. */
export function statusFromValue(value: AttributeValue | undefined): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599) {
    return value;
  }
  if (typeof value === 'string' && /^[1-5]\d{2}$/.test(value.trim())) {
    return Number(value);
  }
  return null;
}

const NON_ID_VALUES = new Set(['', 'null', 'none', 'nil', 'undefined', '-', 'n/a', 'unknown']);

/** An identifier worth following: a short, non-empty token that is not a placeholder. */
export function cleanIdentifier(value: AttributeValue | undefined): string | null {
  if (value === undefined || value === null || typeof value === 'boolean') {
    return null;
  }
  const text = String(value)
    .trim()
    .replace(/^["']|["']$/g, '');
  if (text.length === 0 || text.length > 128 || NON_ID_VALUES.has(text.toLowerCase())) {
    return null;
  }
  return text;
}

const EVENT_IDENTIFIER_FIELDS = [
  'traceId',
  'spanId',
  'requestId',
  'sessionId',
  'userId',
  'orderId',
] as const;
const ATTRIBUTE_IDENTIFIER_FIELDS = ['transactionId', 'deploymentId', 'configId', 'jobId'] as const;

/**
 * Copies what a set of key/value pairs says into the event: identifiers, service, host, status
 * and error code. A field the event already has is never overwritten, and every pair is also
 * kept in `attributes` so no information is lost.
 */
export function applyPairs(event: NormalizedLogEvent, pairs: Record<string, AttributeValue>): void {
  for (const [key, value] of Object.entries(pairs)) {
    if (!(key in event.attributes)) {
      event.attributes[key] = value;
    }
    const field = fieldOfKey(key);
    if (field === null) {
      continue;
    }
    applyField(event, field, value);
  }
}

function applyField(event: NormalizedLogEvent, field: EventField, value: AttributeValue): void {
  if ((EVENT_IDENTIFIER_FIELDS as readonly string[]).includes(field)) {
    fillIdentifier(event, field as (typeof EVENT_IDENTIFIER_FIELDS)[number], value);
    return;
  }
  if ((ATTRIBUTE_IDENTIFIER_FIELDS as readonly string[]).includes(field)) {
    const id = cleanIdentifier(value);
    if (id !== null && event.attributes[field] === undefined) {
      event.attributes[field] = id;
    }
    return;
  }
  fillPlainField(event, field, value);
}

function fillIdentifier(
  event: NormalizedLogEvent,
  field: (typeof EVENT_IDENTIFIER_FIELDS)[number],
  value: AttributeValue,
): void {
  const id = cleanIdentifier(value);
  if (id !== null && event[field] === null) {
    event[field] = id;
  }
}

function fillPlainField(event: NormalizedLogEvent, field: EventField, value: AttributeValue): void {
  if (field === 'service' && event.service === null) {
    event.service = cleanIdentifier(value);
  }
  if (field === 'host' && event.host === null) {
    event.host = cleanIdentifier(value);
  }
  if (field === 'statusCode' && event.statusCode === null) {
    event.statusCode = statusFromValue(value);
  }
  if (field === 'errorCode' && event.errorCode === null) {
    event.errorCode = cleanIdentifier(value);
  }
  if (field === 'level' && event.level === 'unknown') {
    event.level = normaliseLevel(value);
  }
}
