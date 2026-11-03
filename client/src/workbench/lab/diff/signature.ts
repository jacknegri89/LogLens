import type { ParsedLine } from '../../types';

const MAX_SIGNATURE_LENGTH = 200;

/** Steps run in order: the longer and more specific shapes first, so a UUID is not eaten as numbers. */
const SHAPES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g, '<time>'],
  [/\b\d{1,2}:\d{2}:\d{2}(?:[.,]\d+)?\b/g, '<time>'],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<uuid>'],
  [/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, '<ip>'],
  [/\b0x[0-9a-f]+\b/gi, '<hex>'],
  [/\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8,}\b/gi, '<hex>'],
  [/\b\d+\.\d+\b/g, '<n>'],
];

/** A word that holds a digit: a bare number, a number with a unit, or an id like `req-9f3a`. */
const WORD_WITH_DIGIT = /[A-Za-z0-9_-]*\d[A-Za-z0-9_-]*/g;
const NUMBER_WITH_UNIT = /^\d+([A-Za-z%]{1,3})$/;
const MIN_ID_LENGTH = 6;

function placeholderForWord(word: string): string {
  if (/^\d+$/.test(word)) return '<n>';
  const unit = word.match(NUMBER_WITH_UNIT)?.[1];
  if (unit) return `<n>${unit}`;
  return /[A-Za-z]/.test(word) && word.length >= MIN_ID_LENGTH ? '<id>' : word;
}

/**
 * The shape of a message with its variable parts replaced by placeholders, so that
 * "timeout after 3012ms for order 4412" and "... 3187ms for order 9021" are one signature.
 */
export function normalizeMessage(message: string): string {
  let shaped = message;
  for (const [shape, placeholder] of SHAPES) shaped = shaped.replace(shape, placeholder);
  const normalized = shaped
    .replace(WORD_WITH_DIGIT, placeholderForWord)
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.slice(0, MAX_SIGNATURE_LENGTH);
}

export function signatureOf(line: ParsedLine): string {
  const signature = normalizeMessage(line.message);
  return signature === '' ? normalizeMessage(line.raw) : signature;
}
