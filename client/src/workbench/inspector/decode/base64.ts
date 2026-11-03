const BASE64URL_ALPHABET = /^[A-Za-z0-9_-]*$/;
const BASE64_ALPHABET = /^[A-Za-z0-9+/_-]*={0,2}$/;

function toBytes(text: string): Uint8Array | null {
  const unpadded = text.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/');
  if (unpadded.length % 4 === 1) return null;
  try {
    const binary = atob(unpadded.padEnd(Math.ceil(unpadded.length / 4) * 4, '='));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

/** The UTF-8 text inside base64 or base64url, or null when it is not valid base64 or not valid UTF-8. */
export function decodeBase64Text(encoded: string, urlSafeOnly = false): string | null {
  const alphabet = urlSafeOnly ? BASE64URL_ALPHABET : BASE64_ALPHABET;
  if (encoded === '' || !alphabet.test(encoded)) return null;
  const bytes = toBytes(encoded);
  if (!bytes) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** The share of characters that a person could type or read: letters, digits, punctuation, spaces. */
export function printableRatio(text: string): number {
  if (text === '') return 0;
  let printable = 0;
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127 && code !== 0xfffd))
      printable += 1;
  }
  return printable / [...text].length;
}

/** Pretty JSON for text that is a JSON object or array, otherwise null. */
export function prettyJsonOrNull(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return null;
  }
}
