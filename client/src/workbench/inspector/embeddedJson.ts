export interface JsonSegment {
  start: number;
  end: number;
  value: unknown;
}

/** Longest text searched and most parse attempts, so a line full of braces cannot freeze the page. */
const MAX_SEARCHED_LENGTH = 200_000;
const MAX_PARSE_ATTEMPTS = 40;
const MAX_JSON_DEPTH = 100;

const CLOSERS: Record<string, string> = { '{': '}', '[': ']' };

/** The index just after the bracket that closes the one at `start`, skipping strings; -1 if unbalanced. */
export function findClosingIndex(text: string, start: number): number {
  const stack: string[] = [];
  let insideString = false;
  for (let position = start; position < text.length; position += 1) {
    const character = text[position];
    if (insideString) {
      if (character === '\\') {
        position += 1;
      } else if (character === '"') {
        insideString = false;
      }
    } else if (character === '"') {
      insideString = true;
    } else if (character in CLOSERS) {
      if (stack.length >= MAX_JSON_DEPTH) {
        return -1;
      }
      stack.push(CLOSERS[character]);
    } else if (character === '}' || character === ']') {
      if (stack.pop() !== character) {
        return -1;
      }
      if (stack.length === 0) {
        return position + 1;
      }
    }
  }
  return -1;
}

/** An empty object, or a short array of plain values, tells nothing: `[7]` and `[INFO]` are not data. */
function isWorthShowing(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.length >= 2 || value.some((item) => typeof item === 'object');
  }
  return value !== null && typeof value === 'object' && Object.keys(value).length > 0;
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function readSegmentAt(text: string, start: number): JsonSegment | null {
  const end = findClosingIndex(text, start);
  if (end === -1) {
    return null;
  }
  const value = tryParse(text.slice(start, end));
  if (isWorthShowing(value)) {
    return { start, end, value };
  }
  return null;
}

/** The JSON objects and arrays written inside a text, outermost first. The text itself may be one. */
export function findJsonSegments(text: string): JsonSegment[] {
  const searched = text.slice(0, MAX_SEARCHED_LENGTH);
  const segments: JsonSegment[] = [];
  let attempts = 0;
  let position = searched.search(/[{[]/);
  while (position !== -1 && attempts < MAX_PARSE_ATTEMPTS) {
    attempts += 1;
    const segment = readSegmentAt(searched, position);
    let next = position + 1;
    if (segment) {
      next = segment.end;
      segments.push(segment);
    }
    const offset = searched.slice(next).search(/[{[]/);
    if (offset === -1) {
      position = -1;
    } else {
      position = next + offset;
    }
  }
  return segments;
}

/** Pretty text for a parsed JSON value. */
export function prettyPrint(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
