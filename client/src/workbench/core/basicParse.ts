import type { LogLevel, ParsedLine } from '../types';

const ISO_TIME = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d{1,6})?(?:Z|[+-]\d{2}:?\d{2})?/;
const LEVEL = /\b(FATAL|CRITICAL|ERROR|ERR|WARN(?:ING)?|INFO|DEBUG|TRACE)\b/i;
const KEY_VALUE = /\b([A-Za-z_][\w.-]*)=("[^"]*"|\S+)/g;
const LATENCY =
  /\b(?:latency|duration|took|elapsed)[=: ]+(\d+(?:\.\d+)?)\s*ms\b|\b(\d+(?:\.\d+)?)\s*ms\b/i;
const STACK_FRAME = /^\s+at\s|^\s*File ".+", line \d+|^\s*Traceback \(|\bcaused by:/i;
const FAULT_WORDS = /\bexception\b|\bpanic(?:ked)?\b|\bfatal\b|\bsegfault\b|\bkilled\b|OOMKilled/i;
// "TypeError: ...", "java.lang.OutOfMemoryError: ...": case-sensitive, so "0 errors:" stays quiet.
const ERROR_NAME = /\b(?:[A-Z]\w*)?(?:Error|Exception):/;
const HAS_ZONE = /[Zz]|[+-]\d{2}:?\d{2}$/;

const LEVEL_NAMES: Record<string, LogLevel> = {
  FATAL: 'FATAL',
  CRITICAL: 'FATAL',
  ERROR: 'ERROR',
  ERR: 'ERROR',
  WARN: 'WARN',
  WARNING: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  TRACE: 'TRACE',
};

function readTimestamp(text: string): number | null {
  const match = text.match(ISO_TIME)?.[0];
  if (!match) return null;
  const normalized = match.replace(' ', 'T').replace(',', '.');
  const parsed = Date.parse(HAS_ZONE.test(normalized) ? normalized : `${normalized}Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

function readLevel(text: string): LogLevel | null {
  const name = text.match(LEVEL)?.[1]?.toUpperCase();
  return name ? (LEVEL_NAMES[name] ?? null) : null;
}

function readKeyValues(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [, key, value] of text.matchAll(KEY_VALUE)) {
    fields[key.toLowerCase()] = value.replace(/^"|"$/g, '');
  }
  return fields;
}

function flattenJson(value: unknown, prefix: string, into: Record<string, string>): void {
  if (value === null || typeof value !== 'object') {
    into[prefix.toLowerCase()] = String(value);
    return;
  }
  for (const [key, inner] of Object.entries(value)) {
    flattenJson(inner, prefix ? `${prefix}.${key}` : key, into);
  }
}

/** The fields of a line that is a JSON object, or null when it is not one. */
function readJsonFields(text: string): Record<string, string> | null {
  if (!text.trimStart().startsWith('{')) return null;
  try {
    const fields: Record<string, string> = {};
    flattenJson(JSON.parse(text), '', fields);
    return fields;
  } catch {
    return null;
  }
}

function readLatency(text: string, fields: Record<string, string>): number | null {
  const fromField = Number.parseFloat(fields.latency_ms ?? fields.duration_ms ?? '');
  if (!Number.isNaN(fromField)) return fromField;
  const match = text.match(LATENCY);
  const value = Number.parseFloat(match?.[1] ?? match?.[2] ?? '');
  return Number.isNaN(value) ? null : value;
}

function readService(fields: Record<string, string>, text: string): string | null {
  const bracketed = text.match(/\[([\w.-]{2,30})\]/)?.[1];
  return fields.service ?? fields['service.name'] ?? fields.logger ?? bracketed ?? null;
}

function readMessage(jsonFields: Record<string, string> | null, raw: string): string {
  return (
    jsonFields?.message ?? jsonFields?.msg ?? raw.replace(ISO_TIME, '').replace(LEVEL, '').trim()
  );
}

/** Reads one line. It is a fast, forgiving first pass: unknown shapes still give a usable line. */
export function parseLine(raw: string, index: number): ParsedLine {
  const jsonFields = readJsonFields(raw);
  const level = readLevel(jsonFields?.level ?? jsonFields?.severity ?? raw);
  const timeSource = jsonFields?.timestamp ?? jsonFields?.time ?? jsonFields?.['@timestamp'] ?? raw;
  const fields = jsonFields ?? readKeyValues(raw);
  return {
    index,
    raw,
    timestamp: readTimestamp(timeSource),
    level,
    service: readService(fields, raw),
    message: readMessage(jsonFields, raw),
    fields,
    latencyMs: readLatency(raw, fields),
    isFault: level === 'ERROR' || level === 'FATAL' || looksLikeFault(raw),
  };
}

function looksLikeFault(raw: string): boolean {
  return STACK_FRAME.test(raw) || FAULT_WORDS.test(raw) || ERROR_NAME.test(raw);
}

/** Every non-empty line of the log, keeping the original line numbers (0-based). */
export function parseLines(rawLog: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  rawLog.split(/\r?\n/).forEach((text, index) => {
    if (text.trim() !== '') lines.push(parseLine(text, index));
  });
  return lines;
}
