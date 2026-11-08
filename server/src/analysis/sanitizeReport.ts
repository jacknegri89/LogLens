import { maskSecrets } from './masking';

/**
 * Cleans a report before it is shown to somebody other than the person who made the analysis.
 * A shared report is public to anyone who holds the link, so every piece of text in it goes
 * through the same masking the model context uses (tokens, passwords, keys, connection strings)
 * and e-mail addresses are hidden too. The walk is recursive, so a secret cannot hide in a
 * nested field such as an incident's evidence quote, its title or a Markdown block.
 *
 * What stays: the structure, the numbers, the line numbers, the statuses and the technical text
 * that explains the problem. Nothing is invented and nothing is moved.
 */

/** Reports are a few levels deep; anything deeper is not a report and is cut. */
const MAX_DEPTH = 12;
const HIDDEN_EMAIL = '[email]';

// anna.rossi@example.com — bounded parts, so a hostile line cannot make the match slow.
const EMAIL_ADDRESS = /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,5}\b/g;

/** Keys that would change the prototype of the object being built if they were copied. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function sanitizeText(text: string): string {
  const withoutSecrets = maskSecrets(text).text;
  return withoutSecrets.replace(EMAIL_ADDRESS, HIDDEN_EMAIL);
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (typeof value === 'string') {
    return sanitizeText(value);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (depth >= MAX_DEPTH) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) {
      continue;
    }
    cleaned[key] = sanitizeValue(inner, depth + 1);
  }
  return cleaned;
}

/** A copy of the value in which every string is masked. The input is not changed. */
export function sanitizeDeep<T>(value: T): T {
  return sanitizeValue(value, 0) as T;
}
