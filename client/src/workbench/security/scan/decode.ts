/** Longest stretch of a line that is examined, so a huge minified line cannot stall the page. */
const MAX_SCANNED_CHARACTERS = 20_000;
const PERCENT_ESCAPE = /%([0-9a-f]{2})/gi;
const INLINE_COMMENT = /\/\*.{0,100}?\*\//g;
const REQUEST_LINE = /\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE)\s+(\S+)/;
const TARGET_FIELDS = ['request_uri', 'uri', 'url', 'path', 'request', 'endpoint'];

function decodePercentOnce(text: string): string {
  return text.replace(PERCENT_ESCAPE, (_escape, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

/**
 * Text as an attacker's payload would run: percent-decoded twice (double encoding is a common
 * trick), "+" read as a space, SQL comments turned into spaces, lower case.
 */
export function decodeForMatching(text: string): string {
  const limited = text.slice(0, MAX_SCANNED_CHARACTERS);
  const decoded = decodePercentOnce(decodePercentOnce(limited));
  return decoded.replace(/\+/g, ' ').replace(INLINE_COMMENT, ' ').toLowerCase();
}

/** The request target of a web access line ("GET /path?query"), decoded; null for other lines. */
export function requestTarget(raw: string, fields: Record<string, string>): string | null {
  const fromLine = REQUEST_LINE.exec(raw.slice(0, MAX_SCANNED_CHARACTERS))?.[1];
  if (fromLine) return decodeForMatching(fromLine);
  for (const name of TARGET_FIELDS) {
    const value = fields[name];
    if (value) return decodeForMatching(REQUEST_LINE.exec(value)?.[1] ?? value);
  }
  return null;
}
