import type { AttributeValue } from './normalizedEvent';

/** Reading key=value pairs out of text and flattening JSON objects into the same shape. */

/** Text is cut to this length before it is scanned, so a hostile line cannot make a scan slow. */
const MAX_SCAN_LENGTH = 4000;
const MAX_PAIRS = 80;
const MAX_JSON_DEPTH = 4;
const MAX_VALUE_LENGTH = 500;

// key=value, key="quoted value", key='quoted value'. Every part is a plain character class, so the
// scan is linear in the length of the text.
const PAIR_PATTERN =
  /(?<![\w.-])([A-Za-z_][\w.-]{0,40})=("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s,;"'()[\]{}]+)/g;

function unquote(value: string): string {
  const first = value[0];
  if ((first === '"' || first === "'") && value.endsWith(first) && value.length >= 2) {
    return value.slice(1, -1).replace(/\\(["'\\])/g, '$1');
  }
  return value;
}

/** A number, a boolean or null when the text says so; any other text stays text. */
export function coerceValue(text: string): AttributeValue {
  const value = text.slice(0, MAX_VALUE_LENGTH);
  if (/^-?\d{1,15}(?:\.\d{1,9})?$/.test(value) && value.length < 16) {
    // A long digit string (an id, a card number) must stay text.
    if (!/^-?0\d/.test(value)) {
      return Number(value);
    }
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (value === 'null') {
    return null;
  }
  return value;
}

/** The key=value pairs of a text, in the order they appear. The first value of a key wins. */
export function extractPairs(text: string): Record<string, AttributeValue> {
  const pairs: Record<string, AttributeValue> = {};
  let count = 0;
  for (const match of text.slice(0, MAX_SCAN_LENGTH).matchAll(PAIR_PATTERN)) {
    const key = match[1];
    if (!(key in pairs)) {
      pairs[key] = coerceValue(unquote(match[2]));
      count += 1;
    }
    if (count >= MAX_PAIRS) {
      break;
    }
  }
  return pairs;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function scalarOf(value: unknown): AttributeValue {
  if (typeof value === 'string') {
    return value.slice(0, MAX_VALUE_LENGTH);
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }
  return JSON.stringify(value).slice(0, MAX_VALUE_LENGTH);
}

/** A JSON object as flat pairs: nested keys are joined with dots ("http.status_code"). */
export function flattenObject(
  value: Record<string, unknown>,
  prefix = '',
  depth = 0,
): Record<string, AttributeValue> {
  const flat: Record<string, AttributeValue> = {};
  for (const [key, child] of Object.entries(value)) {
    if (Object.keys(flat).length >= MAX_PAIRS) {
      break;
    }
    let path = key;
    if (prefix !== '') {
      path = `${prefix}.${key}`;
    }
    if (isPlainObject(child) && depth < MAX_JSON_DEPTH) {
      Object.assign(flat, flattenObject(child, path, depth + 1));
    } else if (child !== undefined) {
      flat[path] = scalarOf(child);
    }
  }
  return flat;
}

/** The object in a line of JSON, or null when the line is not a JSON object. */
export function parseJsonObject(line: string): Record<string, unknown> | null {
  const text = line.trim();
  if (!text.startsWith('{') || !text.endsWith('}')) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    if (isPlainObject(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
