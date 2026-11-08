/**
 * Hides secrets in a text before it leaves the server for an external model. It hides tokens,
 * passwords, keys, cookies and the credentials inside connection strings, and leaves the
 * identifiers that tie events together (request ids, trace ids, order ids): without them the
 * model could not follow a story across lines.
 *
 * Every pattern is linear: bounded character classes and no nested quantifiers, so a hostile log
 * cannot make the masking slow.
 */

const MAX_SECRET_LENGTH = 512;
const REDACTED = '[REDACTED]';

interface MaskRule {
  pattern: RegExp;
  replace: (match: string, ...groups: string[]) => string;
}

/** The names of fields whose value is a secret: `password`, `api_key`, `session_token`, `cookie`. */
const SECRET_KEY =
  '[\\w.-]{0,40}(?:password|passwd|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|authorization|cookie|credential)[\\w.-]{0,20}';

const MASK_RULES: MaskRule[] = [
  {
    // -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----
    pattern:
      /-----BEGIN [A-Z ]{1,30}PRIVATE KEY-----[\s\S]{0,4000}?-----END [A-Z ]{1,30}PRIVATE KEY-----/g,
    replace: () => `${REDACTED}:private-key`,
  },
  {
    // Authorization: Bearer abc.def / Basic dXNlcjpwYXNz
    pattern: /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,512}/g,
    replace: (_match, scheme) => `${scheme} ${REDACTED}`,
  },
  {
    // eyJhbGciOi....payload.signature (a JSON Web Token)
    pattern: /\beyJ[A-Za-z0-9_-]{5,512}\.[A-Za-z0-9_-]{5,512}\.[A-Za-z0-9_-]{0,512}/g,
    replace: () => `${REDACTED}:jwt`,
  },
  {
    // postgres://user:secret@host/db -> postgres://user:[REDACTED]@host/db
    pattern: /\b([a-z][a-z0-9+.-]{1,20}:\/\/[^\s:/@]{1,100}):([^\s@/]{1,200})@/gi,
    replace: (_match, prefix) => `${prefix}:${REDACTED}@`,
  },
  {
    // sk-abc123..., ghp_abc..., xoxb-..., AKIAABCDEFGHIJKLMNOP: well-known key formats
    pattern:
      /\b(?:sk-[A-Za-z0-9_-]{16,200}|gh[pousr]_[A-Za-z0-9]{20,200}|xox[baprs]-[A-Za-z0-9-]{10,200}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,60})\b/g,
    replace: () => `${REDACTED}:key`,
  },
  {
    // "the token tok_a1b2c3d4e5f6g7h8 expired", "secret is 9f8e7d6c5b4a3210": a value in a sentence.
    // Only a value that looks like a credential (long, with letters and digits) is hidden, so
    // "token expired" and "password required" stay readable.
    pattern:
      /\b((?:password|passwd|secret|token|api[_ -]?key|access[_ -]?key)\s+(?:is\s+|was\s+)?)([A-Za-z0-9_-]{16,128})\b/gi,
    replace: (match, lead, value) => {
      if (!/[0-9]/.test(value) || !/[A-Za-z]/.test(value)) {
        return match;
      }
      return `${lead}${REDACTED}`;
    },
  },
  {
    // "password": "hunter2"  /  token=abc123  /  Cookie: sid=abc; theme=dark
    pattern: new RegExp(
      `(["']?${SECRET_KEY}["']?\\s*[:=]\\s*)("[^"\\n]{1,${MAX_SECRET_LENGTH}}"|'[^'\\n]{1,${MAX_SECRET_LENGTH}}'|[^\\s,;&"'}]{1,${MAX_SECRET_LENGTH}})`,
      'gi',
    ),
    replace: (_match, key, value) => {
      if (value.startsWith('"')) {
        return `${key}"${REDACTED}"`;
      }
      if (value.startsWith("'")) {
        return `${key}'${REDACTED}'`;
      }
      return `${key}${REDACTED}`;
    },
  },
];

export interface MaskedText {
  text: string;
  /** How many secrets were hidden. */
  masked: number;
}

export function maskSecrets(text: string): MaskedText {
  let current = text;
  let masked = 0;
  for (const rule of MASK_RULES) {
    current = current.replace(rule.pattern, (...args) => {
      const match = args[0] as string;
      // An already hidden value is not counted twice.
      if (match.includes(REDACTED) && !match.endsWith(REDACTED)) {
        return match;
      }
      const replacement = rule.replace(match, ...(args.slice(1) as string[]));
      // A rule may decide that the match is not a secret after all and give it back unchanged.
      if (replacement === match) {
        return match;
      }
      masked += 1;
      return replacement;
    });
  }
  return { text: current, masked };
}
