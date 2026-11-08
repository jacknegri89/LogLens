import type { AttributeValue, LogLevel } from '../normalizedEvent';
import type { RawRecord } from '../recordSplitter';
import type { ParsedTimestamp, TimestampOptions } from '../timestamps';

/** What every format parser receives: the record and how times must be read. */
export interface ParseContext {
  record: RawRecord;
  /** The record's lines joined with line breaks. */
  text: string;
  /** The first line of the record: most formats describe an event in its first line. */
  firstLine: string;
  timestampOptions: TimestampOptions;
  /** The column names of the last `#Fields:` directive (IIS and other W3C extended logs). */
  w3cFields?: string[];
}

/** What a format parser found. A field it did not find is left out. */
export interface FormatResult {
  /** The name of the format, such as "json" or "syslog". */
  format: string;
  /** `parsed` when the line has the structure the format promises, `partial` when only some of it. */
  status: 'parsed' | 'partial';
  timestamp?: ParsedTimestamp;
  level?: LogLevel;
  service?: string;
  host?: string;
  message?: string;
  /** Extra fields of the format. Identifiers among them are copied to the event by the caller. */
  pairs?: Record<string, AttributeValue>;
}

/** A format parser answers null when the record is not in its format. */
export type FormatParser = (context: ParseContext) => FormatResult | null;
