import type { FormatParser } from './formatTypes';
import { parseGenericLine } from './genericFormat';
import { parseJsonLine, parseWindowsEvent } from './structuredFormats';
import { parseKlog, parseLogcat, parseMysql, parsePostgres, parseSyslog } from './systemFormats';
import {
  parseAccessLog,
  parseApacheError,
  parseNginxError,
  parseW3cExtended,
  w3cFieldsOf,
} from './webFormats';

export type { FormatParser, FormatResult, ParseContext } from './formatTypes';
export { enrichFromStack } from './stackEnrichment';
export { w3cFieldsOf };

/**
 * The format parsers, most specific first: the first one that recognises a record reads it.
 * The generic parser is last because it accepts almost anything that has a time or a level.
 * A record is detected on its own, so one file can mix formats (JSON and nginx, for instance).
 */
export const FORMAT_PARSERS: FormatParser[] = [
  parseWindowsEvent,
  parseW3cExtended,
  parseJsonLine,
  parseSyslog,
  parseAccessLog,
  parseNginxError,
  parseApacheError,
  parseLogcat,
  parseKlog,
  parsePostgres,
  parseMysql,
  parseGenericLine,
];
