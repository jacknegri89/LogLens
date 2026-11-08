import { applyPairs } from './fieldAliases';
import {
  enrichFromStack,
  FORMAT_PARSERS,
  w3cFieldsOf,
  type FormatResult,
  type ParseContext,
} from './formats';
import { extractFreeTextIdentifiers } from './freeTextIdentifiers';
import { inferStatus } from './statusInference';
import {
  emptyEvent,
  type AttributeValue,
  type NormalizedLogEvent,
  type ParseStatus,
} from './normalizedEvent';
import {
  DEFAULT_SPLIT_OPTIONS,
  splitIntoRecords,
  type RawRecord,
  type SplitOptions,
} from './recordSplitter';
import { DEFAULT_TIMESTAMP_OPTIONS, type TimestampOptions } from './timestamps';

export interface NormalizeOptions {
  timestamp?: Partial<TimestampOptions>;
  split?: SplitOptions;
  /** Records past this number are counted but not read, and the result says so. */
  maxEvents?: number;
}

/** What reading a whole log gives: the events in file order and an honest account of the reading. */
export interface NormalizedLog {
  events: NormalizedLogEvent[];
  /** Non-empty physical lines of the log. */
  totalLines: number;
  /** Logical records found; each one is an event, or is counted in `notAcquiredRecords`. */
  totalRecords: number;
  /** Records that were not read because the log has more than `maxEvents` of them. */
  notAcquiredRecords: number;
  /** How many events each format read. */
  formats: Record<string, number>;
  /** The format that read most events. */
  dominantFormat: string;
}

export const DEFAULT_MAX_EVENTS = 50_000;
const MAX_MESSAGE_LENGTH = 2000;

function safelyParse(context: ParseContext): FormatResult | null {
  for (const parse of FORMAT_PARSERS) {
    try {
      const result = parse(context);
      if (result) {
        return result;
      }
    } catch {
      // A malformed line must not stop the reading of the others: try the next format.
    }
  }
  return null;
}

function statusOf(result: FormatResult | null): ParseStatus {
  if (result === null) {
    return 'unparsed';
  }
  return result.status;
}

function applyResult(event: NormalizedLogEvent, result: FormatResult): void {
  event.format = result.format;
  if (result.timestamp) {
    event.timestamp = result.timestamp.iso;
    event.epochMs = result.timestamp.epochMs;
    event.timestampConfidence = result.timestamp.confidence;
  }
  if (result.level) {
    event.level = result.level;
  }
  if (result.service) {
    event.service = result.service;
  }
  if (result.host) {
    event.host = result.host;
  }
  if (result.message !== undefined) {
    event.message = result.message.slice(0, MAX_MESSAGE_LENGTH);
  }
  if (result.pairs) {
    applyPairs(event, result.pairs);
  }
}

/** A status code that the format did not label still says how serious a line with no level is. */
function levelFromStatus(event: NormalizedLogEvent): void {
  if (event.level !== 'unknown' || event.statusCode === null) {
    return;
  }
  if (event.statusCode >= 500) {
    event.level = 'error';
  } else if (event.statusCode >= 400) {
    event.level = 'warn';
  }
}

function hasExtraFields(event: NormalizedLogEvent): boolean {
  return Object.keys(event.attributes).length > 0 || event.level !== 'unknown';
}

/** Reads one record into an event. It never throws and never drops the record. */
export function normalizeRecord(
  record: RawRecord,
  index: number,
  timestampOptions: TimestampOptions,
  w3cFields?: string[],
): NormalizedLogEvent {
  const text = record.lines.join('\n');
  const event = emptyEvent(`E${index + 1}`, record.lineStart, record.lineEnd, text);
  const context: ParseContext = {
    record,
    text,
    firstLine: record.lines[0],
    timestampOptions,
    w3cFields,
  };
  const result = safelyParse(context);
  event.parseStatus = statusOf(result);
  if (result) {
    applyResult(event, result);
  }
  const wordedIds: Record<string, AttributeValue> = extractFreeTextIdentifiers(text);
  applyPairs(event, wordedIds);
  if (record.lines.length > 1 || /(?:Error|Exception)\b/.test(event.message)) {
    enrichFromStack(event, record.lines);
  }
  if (event.statusCode === null) {
    const inferred = inferStatus(record.lines[0]);
    if (inferred !== null) {
      event.statusCode = inferred;
    }
  }
  levelFromStatus(event);
  event.message = event.message.slice(0, MAX_MESSAGE_LENGTH);
  if (event.parseStatus === 'unparsed' && hasExtraFields(event)) {
    event.parseStatus = 'partial';
  }
  return event;
}

function countFormats(events: NormalizedLogEvent[]): {
  formats: Record<string, number>;
  dominant: string;
} {
  const formats: Record<string, number> = {};
  for (const event of events) {
    formats[event.format] = (formats[event.format] ?? 0) + 1;
  }
  let dominant = 'unparsed';
  let best = 0;
  for (const [format, count] of Object.entries(formats)) {
    if (count > best) {
      best = count;
      dominant = format;
    }
  }
  return { formats, dominant };
}

/**
 * Turns the text of a log into normalised events, in the order of the file. It understands
 * JSON Lines, syslog, Apache and nginx, Kubernetes, PostgreSQL, MySQL, Windows events, stack
 * traces and custom application logs, and it reads each record on its own, so a file can mix
 * formats. A line it cannot interpret becomes an `unparsed` event: nothing is lost.
 */
/** Terminal colour codes (ESC [ 31 m) and a byte order mark: noise that would hide a line's time and level. */
// The escape character is the whole point of this pattern.
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\u001b\[[\d;]{0,20}[A-Za-z]/g;
const BYTE_ORDER_MARK = /^\uFEFF/;

/** The text without colour codes and without a byte order mark. Line breaks are untouched, so line numbers hold. */
export function withoutTerminalNoise(text: string): string {
  return text.replace(ANSI_ESCAPE, '').replace(BYTE_ORDER_MARK, '');
}

export function normalizeLog(rawLog: string, options: NormalizeOptions = {}): NormalizedLog {
  const timestampOptions: TimestampOptions = { ...DEFAULT_TIMESTAMP_OPTIONS, ...options.timestamp };
  const maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
  const records = splitIntoRecords(
    withoutTerminalNoise(rawLog),
    options.split ?? DEFAULT_SPLIT_OPTIONS,
  );
  // A W3C `#Fields:` directive names the columns of the lines that follow it.
  let w3cFields: string[] | undefined;
  const events = records.slice(0, maxEvents).map((record, index) => {
    w3cFields = w3cFieldsOf(record.lines) ?? w3cFields;
    return normalizeRecord(record, index, timestampOptions, w3cFields);
  });
  const { formats, dominant } = countFormats(events);
  return {
    events,
    totalLines: records.reduce((sum, record) => sum + record.lines.length, 0),
    totalRecords: records.length,
    notAcquiredRecords: Math.max(0, records.length - events.length),
    formats,
    dominantFormat: dominant,
  };
}
