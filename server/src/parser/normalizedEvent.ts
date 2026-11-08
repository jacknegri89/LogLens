import { z } from 'zod';

/**
 * The internal model of one log event, whatever format it came from. Every other stage of the
 * analysis (selection, correlation, root cause, report) reads this shape and never the raw text.
 *
 * An event is one LOGICAL record: a stack trace of twenty lines is one event that spans twenty
 * physical lines. Information that is specific to a format (a syslog program, an nginx upstream)
 * is kept in `attributes`, so nothing is lost when the log is normalised.
 */

export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'unknown'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * How far the time of an event can be trusted:
 * - `exact`: a full date and time with an explicit zone (or an epoch number).
 * - `assumed`: a full date and time without a zone; the configured zone (UTC by default) is assumed.
 * - `partial`: a time without a date, or a date without a year; it can order lines of one source
 *   but not events of different sources.
 * - `none`: the event has no time at all.
 */
export const TIMESTAMP_CONFIDENCES = ['exact', 'assumed', 'partial', 'none'] as const;
export type TimestampConfidence = (typeof TIMESTAMP_CONFIDENCES)[number];

/** `parsed`: the format was understood; `partial`: only some fields were; `unparsed`: kept as raw text. */
export const PARSE_STATUSES = ['parsed', 'partial', 'unparsed'] as const;
export type ParseStatus = (typeof PARSE_STATUSES)[number];

const attributeValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const normalizedLogEventSchema = z.object({
  /** A stable name inside one analysis ("E12"): reports quote events by it. */
  eventId: z.string().min(1),
  /** The time in ISO 8601 UTC, or null when the event has no full date and time. */
  timestamp: z.string().nullable(),
  /** The same moment as milliseconds since the epoch, for ordering; null when `timestamp` is null. */
  epochMs: z.number().nullable(),
  timestampConfidence: z.enum(TIMESTAMP_CONFIDENCES),
  /** 1-based physical line where the record starts and where it ends. */
  originalLineStart: z.number().int().min(1),
  originalLineEnd: z.number().int().min(1),
  /** The complete text of the record, with its line breaks. */
  raw: z.string(),
  level: z.enum(LOG_LEVELS),
  service: z.string().nullable(),
  host: z.string().nullable(),
  message: z.string(),
  traceId: z.string().nullable(),
  spanId: z.string().nullable(),
  requestId: z.string().nullable(),
  sessionId: z.string().nullable(),
  userId: z.string().nullable(),
  orderId: z.string().nullable(),
  statusCode: z.number().int().nullable(),
  errorCode: z.string().nullable(),
  /** Everything else the format carried: other identifiers, upstream names, durations, key=value pairs. */
  attributes: z.record(z.string(), attributeValueSchema),
  parseStatus: z.enum(PARSE_STATUSES),
  /** The format that read the record ("json", "syslog", "access-log", "generic" ...). */
  format: z.string(),
});

export type NormalizedLogEvent = z.infer<typeof normalizedLogEventSchema>;
export type AttributeValue = z.infer<typeof attributeValueSchema>;

/** The kinds of identifier that tie events together, strongest first. */
export const STRONG_IDENTIFIER_KINDS = [
  'traceId',
  'spanId',
  'requestId',
  'transactionId',
  'orderId',
  'sessionId',
  'deploymentId',
  'configId',
  'jobId',
] as const;
export type StrongIdentifierKind = (typeof STRONG_IDENTIFIER_KINDS)[number];

/** One identifier found in an event: what it is and its value. */
export interface EventIdentifier {
  kind: StrongIdentifierKind;
  value: string;
}

/** A blank event for the given record, to be filled by a format parser. */
export function emptyEvent(
  eventId: string,
  lineStart: number,
  lineEnd: number,
  raw: string,
): NormalizedLogEvent {
  return {
    eventId,
    timestamp: null,
    epochMs: null,
    timestampConfidence: 'none',
    originalLineStart: lineStart,
    originalLineEnd: lineEnd,
    raw,
    level: 'unknown',
    service: null,
    host: null,
    message: raw,
    traceId: null,
    spanId: null,
    requestId: null,
    sessionId: null,
    userId: null,
    orderId: null,
    statusCode: null,
    errorCode: null,
    attributes: {},
    parseStatus: 'unparsed',
    format: 'unparsed',
  };
}

function attributeText(event: NormalizedLogEvent, key: string): string | null {
  const value = event.attributes[key];
  if (typeof value === 'string' && value !== '') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return null;
}

/** Every strong identifier of an event, from its own fields and from its attributes. */
export function identifiersOf(event: NormalizedLogEvent): EventIdentifier[] {
  const found: EventIdentifier[] = [];
  const own: [StrongIdentifierKind, string | null][] = [
    ['traceId', event.traceId],
    ['spanId', event.spanId],
    ['requestId', event.requestId],
    ['orderId', event.orderId],
    ['sessionId', event.sessionId],
  ];
  for (const [kind, value] of own) {
    if (value) {
      found.push({ kind, value });
    }
  }
  for (const kind of ['transactionId', 'deploymentId', 'configId', 'jobId'] as const) {
    const value = attributeText(event, kind);
    if (value) {
      found.push({ kind, value });
    }
  }
  return found;
}
