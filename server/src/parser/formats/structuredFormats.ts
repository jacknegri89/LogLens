import { fieldOfKey, normaliseLevel } from '../fieldAliases';
import { flattenObject, parseJsonObject } from '../keyValues';
import type { AttributeValue } from '../normalizedEvent';
import { parseTimestampValue } from '../timestamps';
import type { FormatParser, FormatResult } from './formatTypes';

/** Structured formats: one JSON object per line, and Windows events as XML or as text. */

const MAX_MESSAGE_LENGTH = 2000;

function firstTextFor(pairs: Record<string, AttributeValue>, field: string): string | null {
  for (const [key, value] of Object.entries(pairs)) {
    if (fieldOfKey(key) === field && typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return null;
}

function firstValueFor(
  pairs: Record<string, AttributeValue>,
  field: string,
): AttributeValue | null {
  for (const [key, value] of Object.entries(pairs)) {
    if (fieldOfKey(key) === field && value !== null) {
      return value;
    }
  }
  return null;
}

/** JSON Lines: the keys are matched by meaning, so "msg", "message" and "log" all give the message. */
export const parseJsonLine: FormatParser = ({ record, firstLine, text, timestampOptions }) => {
  // One line per object, or an object pretty-printed over several lines.
  const isPrettyObject = record.lines.length > 1 && firstLine.trim() === '{';
  if (record.lines.length !== 1 && !isPrettyObject) {
    return null;
  }
  let source = firstLine;
  if (isPrettyObject) {
    source = text;
  }
  const object = parseJsonObject(source);
  if (object === null) {
    return null;
  }
  const pairs = flattenObject(object);
  const result: FormatResult = { format: 'json', status: 'parsed', pairs };
  const timestampValue = firstValueFor(pairs, 'timestamp');
  const timestamp = parseTimestampValue(timestampValue, timestampOptions);
  if (timestamp) {
    result.timestamp = timestamp;
  }
  const levelValue = firstValueFor(pairs, 'level');
  if (levelValue !== null) {
    result.level = normaliseLevel(levelValue);
  }
  const message = firstTextFor(pairs, 'message');
  if (message !== null) {
    result.message = message.slice(0, MAX_MESSAGE_LENGTH);
  } else {
    result.status = 'partial';
  }
  return result;
};

const WINDOWS_XML_LEVELS: Record<string, 'fatal' | 'error' | 'warn' | 'info' | 'debug'> = {
  '1': 'fatal',
  '2': 'error',
  '3': 'warn',
  '4': 'info',
  '5': 'debug',
};

function xmlText(text: string, tag: string): string | null {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([^<]{0,500})</${tag}>`).exec(text);
  return match?.[1]?.trim() ?? null;
}

function xmlAttribute(text: string, tag: string, attribute: string): string | null {
  const tagMatch = new RegExp(`<${tag}\\s([^>]{0,600})>`).exec(text);
  if (!tagMatch) {
    return null;
  }
  const attributeMatch = new RegExp(`${attribute}\\s*=\\s*['"]([^'"]{0,300})['"]`).exec(
    tagMatch[1],
  );
  return attributeMatch?.[1] ?? null;
}

function xmlDataPairs(text: string): Record<string, AttributeValue> {
  const pairs: Record<string, AttributeValue> = {};
  for (const match of text.matchAll(/<Data Name=['"]([\w.-]{1,60})['"]>([^<]{0,300})<\/Data>/g)) {
    pairs[match[1]] = match[2];
  }
  return pairs;
}

function windowsXmlEvent(text: string, options: Parameters<FormatParser>[0]): FormatResult | null {
  const eventId = xmlText(text, 'EventID');
  if (eventId === null) {
    return null;
  }
  const provider = xmlAttribute(text, 'Provider', 'Name');
  const pairs: Record<string, AttributeValue> = { ...xmlDataPairs(text), eventId: Number(eventId) };
  const result: FormatResult = { format: 'windows-event', status: 'parsed', pairs };
  const created = xmlAttribute(text, 'TimeCreated', 'SystemTime');
  const timestamp = parseTimestampValue(created, options.timestampOptions);
  if (timestamp) {
    result.timestamp = timestamp;
  }
  result.level = WINDOWS_XML_LEVELS[xmlText(text, 'Level') ?? ''] ?? 'unknown';
  if (provider) {
    result.service = provider;
  }
  const computer = xmlText(text, 'Computer');
  if (computer) {
    result.host = computer;
  }
  result.message = `${provider ?? 'Windows'} event ${eventId}`;
  return result;
}

const WINDOWS_TEXT_LEVELS: Record<string, 'fatal' | 'error' | 'warn' | 'info'> = {
  critical: 'fatal',
  error: 'error',
  'audit failure': 'error',
  warning: 'warn',
  information: 'info',
  'audit success': 'info',
};

function windowsTextPairs(lines: string[]): Record<string, string> {
  const pairs: Record<string, string> = {};
  for (const line of lines) {
    const match = /^\s*([A-Za-z][A-Za-z ]{0,30}):\s*(.{0,500})$/.exec(line);
    if (match) {
      pairs[match[1].trim().toLowerCase()] = match[2].trim();
    }
  }
  return pairs;
}

function windowsTextEvent(options: Parameters<FormatParser>[0]): FormatResult | null {
  const fields = windowsTextPairs(options.record.lines);
  if (fields['log name'] === undefined || fields['event id'] === undefined) {
    return null;
  }
  const result: FormatResult = {
    format: 'windows-event',
    status: 'parsed',
    pairs: { eventId: Number(fields['event id']) },
    level: WINDOWS_TEXT_LEVELS[(fields.level ?? '').toLowerCase()] ?? 'unknown',
    message: `${fields.source ?? 'Windows'} event ${fields['event id']}`,
  };
  if (fields.source) {
    result.service = fields.source;
  }
  if (fields.computer) {
    result.host = fields.computer;
  }
  const timestamp = parseTimestampValue(fields.date, options.timestampOptions);
  if (timestamp) {
    result.timestamp = timestamp;
  }
  return result;
}

/** Windows Event Log, as XML (`<Event>`) or as the text that Event Viewer copies. */
export const parseWindowsEvent: FormatParser = (context) => {
  if (context.text.includes('<Event')) {
    return windowsXmlEvent(context.text, context);
  }
  if (/^Log Name:\s/.test(context.firstLine)) {
    return windowsTextEvent(context);
  }
  return null;
};
