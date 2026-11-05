import type { DecodedToken, UrlEncodedDetails } from './types';

const ENCODED_RUN = /(?:%[0-9A-Fa-f]{2})+/g;
// A word is a run of non-separator characters. Scanning words once keeps this linear: a regex that
// starts at every position and looks for a %XX inside would be quadratic on a long line.
const WORD = /[^\s"'<>]+/g;
const HAS_ESCAPE = /%[0-9A-Fa-f]{2}/;
const TRAILING_PUNCTUATION = /[.,;:)\]}]+$/;
const KEY_PREFIX = /^[\w.-]+=/;

/** Decodes every valid %XX run and leaves a malformed run (a lone %E9, say) as it was written. */
export function safeDecodePercent(text: string): string {
  return text.replace(ENCODED_RUN, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      return run;
    }
  });
}

function decodeQueryPart(part: string): string {
  return safeDecodePercent(part.replace(/\+/g, ' '));
}

/** Key and value pairs of a query string, decoded. Empty when the text has no `key=value`. */
export function parseQueryPairs(query: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const part of query.split('&')) {
    const equals = part.indexOf('=');
    if (equals <= 0) {
      continue;
    }
    pairs.push([decodeQueryPart(part.slice(0, equals)), decodeQueryPart(part.slice(equals + 1))]);
  }
  return pairs;
}

function queryOf(word: string): string {
  let afterQuestion = word;
  if (word.includes('?')) {
    afterQuestion = word.slice(word.indexOf('?') + 1);
  }
  return afterQuestion.split('#')[0];
}

/** What a word with %XX escapes says, or null when decoding changes nothing. */
export function decodeUrlWord(word: string): UrlEncodedDetails | null {
  const text = safeDecodePercent(word);
  if (text === word) {
    return null;
  }
  let pairs: Array<[string, string]> = [];
  if (word.includes('&') || word.includes('?')) {
    pairs = parseQueryPairs(queryOf(word));
  }
  return { kind: 'urlencoded', text, pairs };
}

/** Splits `key=value` so only the value is marked, unless the word is a whole query string. */
function valueOffset(word: string): number {
  const isSingleAssignment = !word.includes('&') && !word.includes('?') && KEY_PREFIX.test(word);
  if (isSingleAssignment) {
    return word.indexOf('=') + 1;
  }
  return 0;
}

export function findUrlEncoded(text: string): DecodedToken[] {
  const found: DecodedToken[] = [];
  for (const match of text.matchAll(WORD)) {
    if (!HAS_ESCAPE.test(match[0])) {
      continue;
    }
    const trimmed = match[0].replace(TRAILING_PUNCTUATION, '');
    const offset = valueOffset(trimmed);
    const source = trimmed.slice(offset);
    const details = decodeUrlWord(source);
    if (!details) {
      continue;
    }
    const start = match.index + offset;
    found.push({
      id: `urlencoded-${start}`,
      kind: 'urlencoded',
      start,
      end: start + source.length,
      source,
      details,
    });
  }
  return found;
}
