export type ExtractorId = 'ipv4' | 'uuid' | 'secrets' | 'stackFrames' | 'latencies';

export interface Extractor {
  id: ExtractorId;
  pattern: string;
  flags: string;
  /** Secrets are shown shortened in the value list, so a copied list does not leak them. */
  maskValues: boolean;
}

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';

export const EXTRACTORS: readonly Extractor[] = [
  { id: 'ipv4', pattern: `\\b(?:${OCTET}\\.){3}${OCTET}\\b`, flags: '', maskValues: false },
  {
    id: 'uuid',
    pattern: '\\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\b',
    flags: 'i',
    maskValues: false,
  },
  {
    id: 'secrets',
    pattern:
      '\\beyJ[\\w-]{6,}\\.[\\w-]{6,}\\.[\\w-]{6,}|\\bBearer\\s+[\\w.~+/=-]{8,}|\\bsk_(?:live|test)_\\w{8,}|\\bAKIA[0-9A-Z]{16}\\b',
    flags: '',
    maskValues: true,
  },
  {
    // `at fn (file:1:2)`, `at file:1:2`, and the Python `File "x.py", line 3` form.
    id: 'stackFrames',
    pattern: '\\bat\\s+(?:\\S+\\s+)?\\(?[^\\s()]+:\\d+:\\d+\\)?|File "[^"]+", line \\d+',
    flags: '',
    maskValues: false,
  },
  { id: 'latencies', pattern: '\\b\\d+(?:\\.\\d+)?\\s*ms\\b', flags: '', maskValues: false },
];

export function findExtractor(id: ExtractorId): Extractor {
  const extractor = EXTRACTORS.find((candidate) => candidate.id === id);
  if (!extractor) throw new Error(`Unknown extractor ${id}`);
  return extractor;
}

const VISIBLE_SECRET_CHARS = 6;
const HIDDEN = '••••';
const BEARER_PREFIX = /^Bearer\s+/;

/** Keeps the start of a secret so it can still be told apart, and hides the rest. */
export function maskSecret(value: string): string {
  const prefix = value.match(BEARER_PREFIX)?.[0] ?? '';
  const secret = value.slice(prefix.length);
  if (secret.length <= VISIBLE_SECRET_CHARS) return prefix + HIDDEN;
  return prefix + secret.slice(0, VISIBLE_SECRET_CHARS) + HIDDEN;
}
