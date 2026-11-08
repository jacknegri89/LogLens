import type { TimestampConfidence } from './normalizedEvent';

/** What a log time can be read with: the zone to assume and the year syslog never writes. */
export interface TimestampOptions {
  /** Minutes east of UTC assumed for a time written without a zone. UTC (0) by default. */
  defaultOffsetMinutes: number;
  /** Year assumed for a time that has a day and a month but no year. */
  referenceYear: number;
}

export const DEFAULT_TIMESTAMP_OPTIONS: TimestampOptions = {
  defaultOffsetMinutes: 0,
  referenceYear: new Date().getUTCFullYear(),
};

export interface ParsedTimestamp {
  /** ISO 8601 in UTC, or null when the text has no full date. */
  iso: string | null;
  epochMs: number | null;
  confidence: TimestampConfidence;
  /** The time exactly as the log wrote it. */
  raw: string;
}

/** A timestamp found inside a line, with the place where it sits. */
export interface FoundTimestamp {
  timestamp: ParsedTimestamp;
  start: number;
  end: number;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** Only the beginning of a line is searched: a time that comes later is a field, not the event time. */
const SEARCH_WINDOW = 160;
const MS_PER_MINUTE = 60_000;
const MIN_EPOCH_SECONDS = 946_684_800; // 2000-01-01
const MAX_EPOCH_SECONDS = 4_102_444_800; // 2100-01-01

// 2026-11-03T14:02:00.112Z, 2026-11-03 14:02:00,112 +01:00, 2026-11-03 14:02:00 UTC
const ISO_PATTERN =
  /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:[.,](\d{1,9}))?(Z|[+-]\d{2}(?::?\d{2})?| ?UTC| ?GMT| [+-]\d{2}:?\d{2})?/;
// nginx error log: 2026/11/03 14:02:00
const SLASH_PATTERN = /(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
// Apache and nginx access log: 10/Oct/2000:13:55:36 -0700
const COMMON_LOG_PATTERN = /(\d{2})\/([A-Z][a-z]{2})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})/;
// Windows event text: 11/3/2026 2:02:00 PM
const AMERICAN_PATTERN = /(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2}):(\d{2}) ?(AM|PM)/;
// Syslog RFC 3164: Nov  3 14:02:00 (no year, no zone)
const SYSLOG_PATTERN = /\b([A-Z][a-z]{2})\s{1,2}(\d{1,2}) (\d{2}):(\d{2}):(\d{2})\b/;
// Redis: 04 Nov 2026 10:00:04.456 (no zone)
const REDIS_PATTERN = /\b(\d{2}) ([A-Z][a-z]{2}) (\d{4}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?/;
// Android logcat: 11-04 10:00:03.456 (no year)
const LOGCAT_PATTERN = /(?<![\d-])(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d{3})\b/;
// Linux audit: msg=audit(1697395202.789:36)
const AUDIT_PATTERN = /audit\((\d{10}(?:\.\d{1,9})?):\d+\)/;
// A line that starts with a Unix time: 1730714403 ERROR ...
const LEADING_EPOCH_PATTERN = /^\s{0,3}(\d{10}(?:\.\d{1,9})?|\d{13})(?=\s)/;
// Blue Gene/L: 2005-06-03-15.42.50.675872 (date, then time with dots, after a dash)
const DASHED_PATTERN = /(\d{4})-(\d{2})-(\d{2})-(\d{2})\.(\d{2})\.(\d{2})(?:\.(\d{1,9}))?/;
// HDFS: 081110 020724 (yymmdd HHMMSS) at the very start of the line
const COMPACT_PATTERN = /^\s{0,3}(\d{2})(\d{2})(\d{2}) (\d{2})(\d{2})(\d{2})(?=\s)/;
// A bare clock time: 14:02:00.112
const CLOCK_PATTERN = /\b(\d{2}):(\d{2}):(\d{2})(?:[.,](\d{1,9}))?\b/;

const MICROSECOND_DIGITS = 16;
const MICROSECONDS_PER_MILLISECOND = 1000;
const NANOSECONDS_PER_MILLISECOND = 1_000_000;

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= lastDay;
}

function isValidClock(hour: number, minute: number, second: number): boolean {
  return hour < 24 && minute < 60 && second <= 60;
}

/** Milliseconds from a fraction of a second written with 1 to 9 digits. */
function fractionToMilliseconds(fraction: string | undefined): number {
  if (!fraction) {
    return 0;
  }
  return Number(fraction.slice(0, 3).padEnd(3, '0'));
}

function offsetFromText(zone: string | undefined): number | null {
  if (zone === undefined) {
    return null;
  }
  const text = zone.trim();
  if (text === 'Z' || text === 'UTC' || text === 'GMT') {
    return 0;
  }
  const match = /^([+-])(\d{2}):?(\d{2})?$/.exec(text);
  if (!match) {
    return null;
  }
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? '0');
  if (match[1] === '-') {
    return -minutes;
  }
  return minutes;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

function toEpoch(parts: DateParts, offsetMinutes: number): number | null {
  const { year, month, day, hour, minute, second, millisecond } = parts;
  if (!isValidDate(year, month, day) || !isValidClock(hour, minute, second)) {
    return null;
  }
  return (
    Date.UTC(year, month - 1, day, hour, minute, second, millisecond) -
    offsetMinutes * MS_PER_MINUTE
  );
}

function build(
  raw: string,
  epochMs: number | null,
  confidence: TimestampConfidence,
): ParsedTimestamp | null {
  if (epochMs === null) {
    return null;
  }
  return { iso: new Date(epochMs).toISOString(), epochMs, confidence, raw };
}

function parseIso(match: RegExpExecArray, options: TimestampOptions): ParsedTimestamp | null {
  const [text, year, month, day, hour, minute, second, fraction, zone] = match;
  const writtenOffset = offsetFromText(zone);
  let offset = options.defaultOffsetMinutes;
  let confidence: TimestampConfidence = 'assumed';
  if (writtenOffset !== null) {
    offset = writtenOffset;
    confidence = 'exact';
  }
  const parts: DateParts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: fractionToMilliseconds(fraction),
  };
  return build(text, toEpoch(parts, offset), confidence);
}

function parseSlash(match: RegExpExecArray, options: TimestampOptions): ParsedTimestamp | null {
  const [text, year, month, day, hour, minute, second] = match;
  const parts: DateParts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: 0,
  };
  return build(text, toEpoch(parts, options.defaultOffsetMinutes), 'assumed');
}

function parseDashed(match: RegExpExecArray, options: TimestampOptions): ParsedTimestamp | null {
  const [text, year, month, day, hour, minute, second, fraction] = match;
  const parts: DateParts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: fractionToMilliseconds(fraction),
  };
  return build(text, toEpoch(parts, options.defaultOffsetMinutes), 'assumed');
}

function parseCompact(match: RegExpExecArray, options: TimestampOptions): ParsedTimestamp | null {
  const [text, shortYear, month, day, hour, minute, second] = match;
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) {
    return null;
  }
  if (!isValidClock(Number(hour), Number(minute), Number(second))) {
    return null;
  }
  const parts: DateParts = {
    year: 2000 + Number(shortYear),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: 0,
  };
  return build(text.trim(), toEpoch(parts, options.defaultOffsetMinutes), 'assumed');
}

function parseCommonLog(match: RegExpExecArray): ParsedTimestamp | null {
  const [text, day, monthName, year, hour, minute, second, zone] = match;
  const month = MONTHS[monthName.toLowerCase()];
  const offset = offsetFromText(zone);
  if (month === undefined || offset === null) {
    return null;
  }
  const parts: DateParts = {
    year: Number(year),
    month,
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: 0,
  };
  return build(text, toEpoch(parts, offset), 'exact');
}

function parseAmerican(match: RegExpExecArray, options: TimestampOptions): ParsedTimestamp | null {
  const [text, month, day, year, hourText, minute, second, meridiem] = match;
  let hour = Number(hourText) % 12;
  if (meridiem === 'PM') {
    hour += 12;
  }
  const parts: DateParts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour,
    minute: Number(minute),
    second: Number(second),
    millisecond: 0,
  };
  return build(text, toEpoch(parts, options.defaultOffsetMinutes), 'assumed');
}

function parseSyslog(match: RegExpExecArray, options: TimestampOptions): ParsedTimestamp | null {
  const [text, monthName, day, hour, minute, second] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (month === undefined) {
    return null;
  }
  const parts: DateParts = {
    year: options.referenceYear,
    month,
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: 0,
  };
  return build(text, toEpoch(parts, options.defaultOffsetMinutes), 'partial');
}

function parseRedis(match: RegExpExecArray, options: TimestampOptions): ParsedTimestamp | null {
  const [text, day, monthName, year, hour, minute, second, fraction] = match;
  const month = MONTHS[monthName.toLowerCase()];
  if (month === undefined) {
    return null;
  }
  const parts: DateParts = {
    year: Number(year),
    month,
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: fractionToMilliseconds(fraction),
  };
  return build(text, toEpoch(parts, options.defaultOffsetMinutes), 'assumed');
}

function parseLogcat(match: RegExpExecArray, options: TimestampOptions): ParsedTimestamp | null {
  const [text, month, day, hour, minute, second, fraction] = match;
  const parts: DateParts = {
    year: options.referenceYear,
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: fractionToMilliseconds(fraction),
  };
  return build(text, toEpoch(parts, options.defaultOffsetMinutes), 'partial');
}

function parseClock(match: RegExpExecArray): ParsedTimestamp | null {
  const [text, hour, minute, second] = match;
  if (!isValidClock(Number(hour), Number(minute), Number(second))) {
    return null;
  }
  return { iso: null, epochMs: null, confidence: 'partial', raw: text };
}

interface TimestampShape {
  pattern: RegExp;
  read: (match: RegExpExecArray, options: TimestampOptions) => ParsedTimestamp | null;
}

/** From the most to the least specific: a full date beats a clock time that sits inside it. */
const SHAPES: TimestampShape[] = [
  { pattern: ISO_PATTERN, read: parseIso },
  { pattern: DASHED_PATTERN, read: parseDashed },
  { pattern: COMPACT_PATTERN, read: parseCompact },
  { pattern: COMMON_LOG_PATTERN, read: (match) => parseCommonLog(match) },
  { pattern: SLASH_PATTERN, read: parseSlash },
  { pattern: AMERICAN_PATTERN, read: parseAmerican },
  { pattern: LEADING_EPOCH_PATTERN, read: (match) => parseEpochValue(match[1]) },
  { pattern: AUDIT_PATTERN, read: (match) => parseEpochValue(match[1]) },
  { pattern: REDIS_PATTERN, read: parseRedis },
  { pattern: LOGCAT_PATTERN, read: parseLogcat },
  { pattern: SYSLOG_PATTERN, read: parseSyslog },
  { pattern: CLOCK_PATTERN, read: (match) => parseClock(match) },
];

/**
 * The first timestamp near the start of a line, whatever its format: ISO with any zone,
 * Apache, nginx, syslog, Windows or a bare clock time. Returns null when the line has none.
 */
export function findTimestamp(
  line: string,
  options: TimestampOptions = DEFAULT_TIMESTAMP_OPTIONS,
): FoundTimestamp | null {
  const window = line.slice(0, SEARCH_WINDOW);
  let best: FoundTimestamp | null = null;
  for (const shape of SHAPES) {
    const match = shape.pattern.exec(window);
    if (!match) {
      continue;
    }
    const timestamp = shape.read(match, options);
    if (timestamp === null) {
      continue;
    }
    const found = { timestamp, start: match.index, end: match.index + match[0].length };
    if (best === null || found.start < best.start) {
      best = found;
    }
  }
  return best;
}

/** A Unix time in seconds (with an optional fraction) or in milliseconds, as a number or text. */
export function parseEpochValue(value: string | number): ParsedTimestamp | null {
  const text = String(value).trim();
  const seconds = /^(\d{10})(?:\.(\d{1,9}))?$/.exec(text);
  if (seconds) {
    const epochSeconds = Number(seconds[1]);
    if (epochSeconds < MIN_EPOCH_SECONDS || epochSeconds > MAX_EPOCH_SECONDS) {
      return null;
    }
    const epochMs = epochSeconds * 1000 + fractionToMilliseconds(seconds[2]);
    return build(text, epochMs, 'exact');
  }
  // Microseconds (journald) and nanoseconds, as written by systemd and some Go loggers.
  if (/^(?:\d{16}|\d{19})$/.test(text)) {
    let divisor = MICROSECONDS_PER_MILLISECOND;
    if (text.length !== MICROSECOND_DIGITS) {
      divisor = NANOSECONDS_PER_MILLISECOND;
    }
    const epochMs = Math.floor(Number(text) / divisor);
    if (epochMs < MIN_EPOCH_SECONDS * 1000 || epochMs > MAX_EPOCH_SECONDS * 1000) {
      return null;
    }
    return build(text, epochMs, 'exact');
  }
  if (/^\d{13}$/.test(text)) {
    const epochMs = Number(text);
    if (epochMs < MIN_EPOCH_SECONDS * 1000 || epochMs > MAX_EPOCH_SECONDS * 1000) {
      return null;
    }
    return build(text, epochMs, 'exact');
  }
  return null;
}

/** A timestamp field of a structured log: an epoch number, an ISO string, or any other known shape. */
export function parseTimestampValue(
  value: unknown,
  options: TimestampOptions = DEFAULT_TIMESTAMP_OPTIONS,
): ParsedTimestamp | null {
  if (typeof value === 'number' || typeof value === 'string') {
    const epoch = parseEpochValue(value);
    if (epoch) {
      return epoch;
    }
  }
  if (typeof value === 'string') {
    return findTimestamp(value, options)?.timestamp ?? null;
  }
  return null;
}
