import { decodeBase64Text, prettyJsonOrNull, printableRatio } from './base64';
import type { DecodedToken } from './types';

const BASE64_SHAPE = /(?<![A-Za-z0-9+/_-])[A-Za-z0-9+/_-]{16,}={0,2}(?![A-Za-z0-9+/_=-])/g;
const HEX_ONLY = /^[0-9a-f]+$/i;
const MIN_PRINTABLE_RATIO = 0.95;
const MIN_DECODED_LENGTH = 4;

/** Plain words, hex ids and UUIDs share base64's alphabet; real base64 text mixes cases or has digits. */
function looksLikeBase64(candidate: string): boolean {
  const compact = candidate.replace(/[-_=]/g, '');
  if (HEX_ONLY.test(compact)) {
    return false;
  }
  const hasUpper = /[A-Z]/.test(candidate);
  const hasLower = /[a-z]/.test(candidate);
  const hasDigitOrSymbol = /[0-9+/=]/.test(candidate);
  return hasUpper && hasLower && (hasDigitOrSymbol || candidate.length % 4 === 0);
}

/** The text a base64 candidate stands for, or null when it is not convincingly readable text. */
export function decodeBase64Candidate(
  candidate: string,
): { text: string; json: string | null } | null {
  if (!looksLikeBase64(candidate)) {
    return null;
  }
  const text = decodeBase64Text(candidate);
  if (text === null || text.length < MIN_DECODED_LENGTH) {
    return null;
  }
  if (printableRatio(text) < MIN_PRINTABLE_RATIO) {
    return null;
  }
  return { text, json: prettyJsonOrNull(text) };
}

export function findBase64(text: string): DecodedToken[] {
  const found: DecodedToken[] = [];
  for (const match of text.matchAll(BASE64_SHAPE)) {
    const decoded = decodeBase64Candidate(match[0]);
    if (!decoded) {
      continue;
    }
    const start = match.index;
    found.push({
      id: `base64-${start}`,
      kind: 'base64',
      start,
      end: start + match[0].length,
      source: match[0],
      details: { kind: 'base64', ...decoded },
    });
  }
  return found;
}
