import type { AttributeValue, NormalizedLogEvent } from '../parser/normalizedEvent';

/**
 * The meaningful words of an event: what it is about, with the filler taken out. Two events that
 * share a rare word ("reservation", "ttl", "inventory") are about the same thing; two events that
 * share only "error" or "request" are not. The correlation engine uses this to relate a change to
 * the failures that follow it without a table of known cases.
 */

const MIN_TERM_LENGTH = 3;
const MAX_TERMS_PER_EVENT = 60;

/** Words that appear in almost every log line and say nothing about the subject. */
const FILLER = new Set([
  'the',
  'and',
  'for',
  'not',
  'was',
  'now',
  'are',
  'has',
  'had',
  'with',
  'from',
  'that',
  'this',
  'into',
  'out',
  'info',
  'error',
  'warn',
  'warning',
  'debug',
  'trace',
  'fatal',
  'level',
  'message',
  'msg',
  'log',
  'config',
  'configuration',
  'setting',
  'deploy',
  'deployment',
  'change',
  'chang',
  'update',
  'reload',
  'load',
  'apply',
  'start',
  'started',
  'finish',
  'complete',
  'done',
  'fail',
  'failed',
  'failure',
  'success',
  'succeed',
  'request',
  'response',
  'status',
  'service',
  'server',
  'event',
  'user',
  'true',
  'false',
  'null',
  'none',
  'http',
  'https',
  'www',
  'com',
  'net',
  'org',
  'localhost',
  'ms',
  'sec',
  'id',
  'key',
  'value',
  'name',
  'type',
  'reason',
  'code',
  'time',
  'date',
  'host',
  'port',
  'path',
  'method',
  'get',
  'post',
  'put',
  'delete',
  'old',
  'new',
  'prev',
  'previous',
  'version',
  'build',
  'release',
  'rollout',
  'rolled',
]);

/** A small stemmer: enough that "reservations", "reserved" and "reservation" meet, nothing more. */
function stem(word: string): string {
  if (word.endsWith('ies') && word.length > 4) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.endsWith('ing') && word.length > 5) {
    return word.slice(0, -3);
  }
  if (word.endsWith('ed') && word.length > 4) {
    return word.slice(0, -2);
  }
  if (word.endsWith('ion') && word.length > 6) {
    return word.slice(0, -3);
  }
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) {
    return word.slice(0, -1);
  }
  return word;
}

/** "reservation.ttlMs" -> ["reservation", "ttl", "ms"]: dots, underscores and camelCase all split. */
function splitWords(text: string): string[] {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
}

function isIdentifierLike(word: string): boolean {
  // Hex runs and words that carry digits are ids, counters or sizes, not subjects.
  return /^\d+$/.test(word) || /^[0-9a-f]{8,}$/.test(word) || /\d/.test(word);
}

export function termsOfText(text: string): Set<string> {
  const terms = new Set<string>();
  for (const word of splitWords(text.slice(0, 1500))) {
    if (word.length < MIN_TERM_LENGTH || isIdentifierLike(word)) {
      continue;
    }
    const stemmed = stem(word);
    if (stemmed.length >= MIN_TERM_LENGTH && !FILLER.has(word) && !FILLER.has(stemmed)) {
      terms.add(stemmed);
    }
    if (terms.size >= MAX_TERMS_PER_EVENT) {
      break;
    }
  }
  return terms;
}

function attributeText(attributes: Record<string, AttributeValue>): string {
  return Object.entries(attributes)
    .map(([key, value]) => `${key} ${String(value ?? '')}`)
    .join(' ');
}

/** What an event is about: its message, the keys and values of its fields and its service. */
export function termsOfEvent(event: NormalizedLogEvent): Set<string> {
  const parts = [event.message, attributeText(event.attributes)];
  if (event.service) {
    parts.push(event.service);
  }
  return termsOfText(parts.join(' '));
}

/** The terms two sets have in common. */
export function sharedTerms(first: Set<string>, second: Set<string>): string[] {
  let small = first;
  let large = second;
  if (first.size > second.size) {
    small = second;
    large = first;
  }
  return [...small].filter((term) => large.has(term));
}
