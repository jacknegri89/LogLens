import type { ParsedLine } from '../../types';
import { findBase64 } from './base64Token';
import { findEpochs } from './epoch';
import { findJwts } from './jwt';
import type { DecodedToken } from './types';
import { findUrlEncoded } from './urlEncoded';

/** Longest text scanned for tokens, so one huge line cannot freeze the page. */
export const MAX_SCANNED_LENGTH = 50_000;

/** Earlier finders win when two tokens cover the same characters (a JWT beats the base64 inside it). */
const FINDERS = [findJwts, findBase64, findUrlEncoded, findEpochs];

function overlaps(first: DecodedToken, second: DecodedToken): boolean {
  return first.start < second.end && second.start < first.end;
}

/** The decodable tokens in `text`, in reading order and never overlapping. */
export function findTokens(text: string): DecodedToken[] {
  const scanned = text.slice(0, MAX_SCANNED_LENGTH);
  const kept: DecodedToken[] = [];
  for (const find of FINDERS) {
    for (const token of find(scanned)) {
      if (!kept.some((other) => overlaps(other, token))) kept.push(token);
    }
  }
  return kept.sort((first, second) => first.start - second.start);
}

/** Tokens in the raw line, plus tokens only visible in a parsed field value (JSON escapes, for one). */
export function findLineTokens(line: ParsedLine): DecodedToken[] {
  const inRaw = findTokens(line.raw);
  const seen = new Set(inRaw.map((token) => token.source));
  const fromFields: DecodedToken[] = [];
  for (const [key, value] of Object.entries(line.fields)) {
    for (const token of findTokens(value)) {
      if (seen.has(token.source)) continue;
      seen.add(token.source);
      fromFields.push({ ...token, id: `field-${key}-${token.id}`, start: -1, end: -1 });
    }
  }
  return [...inRaw, ...fromFields];
}

export interface LineSegment {
  text: string;
  token: DecodedToken | null;
}

/** Cuts the line into plain and decodable pieces, so the view renders text nodes and never HTML. */
export function splitSegments(text: string, tokens: readonly DecodedToken[]): LineSegment[] {
  const segments: LineSegment[] = [];
  let cursor = 0;
  for (const token of tokens) {
    if (token.start < cursor || token.end > text.length) continue;
    if (token.start > cursor) segments.push({ text: text.slice(cursor, token.start), token: null });
    segments.push({ text: text.slice(token.start, token.end), token });
    cursor = token.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), token: null });
  return segments;
}
