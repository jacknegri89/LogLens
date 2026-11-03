export type PlaceholderKind = 'IP' | 'EMAIL' | 'SECRET' | 'USER';

export interface AnonymizeResult {
  text: string;
  /** How many different values were replaced, per placeholder kind. */
  replaced: Record<string, number>;
}

interface Registry {
  tokens: Map<string, string>;
  counts: Record<string, number>;
}

/** Every pattern names a `value` group; an optional `prefix` group is kept as written. */
interface Rule {
  kind: PlaceholderKind;
  pattern: RegExp;
  accepts?: (value: string) => boolean;
}

const HEX_GROUP = '[0-9a-fA-F]{1,4}';
const IPV4_OCTET = String.raw`(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)`;
const IPV4_ADDRESS = String.raw`(?:${IPV4_OCTET}\.){3}${IPV4_OCTET}`;
const IPV6_FULL = `(?:${HEX_GROUP}:){7}${HEX_GROUP}`;
// Needs "::", so a clock time such as 12:34:56 is never read as an address.
const IPV6_COMPRESSED = `(?:${HEX_GROUP}(?::${HEX_GROUP}){0,6})?::(?:${HEX_GROUP}(?::${HEX_GROUP}){0,6})?`;

const SECRET_KEY = String.raw`[\w-]*(?:password|passwd|secret(?:[_-]?key)?|token|api[_-]?key)`;
// A trailing dot ends the sentence, so it is not part of the name.
const USER_NAME = String.raw`[\w@\-]+(?:\.[\w@\-]+)*`;
const USER_LABEL = [
  String.raw`user(?:name)?[ \t]*[=:][ \t]*`,
  String.raw`for[ \t]+(?:invalid[ \t]+)?user[ \t]+`,
  String.raw`(?:Failed|Accepted)[ \t]+(?:password|publickey)[ \t]+for[ \t]+(?:invalid[ \t]+user[ \t]+)?`,
  String.raw`invalid[ \t]+user[ \t]+`,
].join('|');

// Order matters: a value hidden by an earlier rule is already a short placeholder for the next ones.
const RULES: Rule[] = [
  {
    kind: 'SECRET',
    pattern: new RegExp(
      String.raw`(?<prefix>\b${SECRET_KEY}["']?[ \t]*[=:][ \t]*["']?)(?<value>[^\s"'&,;)}\]]+)`,
      'gi',
    ),
  },
  {
    kind: 'SECRET',
    pattern: /(?<prefix>\bBearer[ \t]+)(?<value>[A-Za-z0-9._~+/=-]{8,})/gi,
    // Plain lowercase words ("Bearer authentication") are error text, not tokens.
    accepts: (value) => !/^[a-z]+$/.test(value),
  },
  { kind: 'SECRET', pattern: /(?<![\w-])(?<value>eyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]*)/g },
  { kind: 'SECRET', pattern: /(?<![0-9A-Za-z])(?<value>[0-9a-fA-F]{32,})(?![0-9A-Za-z])/g },
  {
    kind: 'SECRET',
    pattern: /(?<![\w+/.-])(?<value>[A-Za-z0-9+_-]{32,}={0,2})(?![\w+/-])/g,
    accepts: isMixedCaseWithDigit,
  },
  {
    kind: 'USER',
    pattern: new RegExp(
      String.raw`(?<prefix>\b(?:${USER_LABEL})["']?)(?<value>${USER_NAME})`,
      'gi',
    ),
  },
  {
    kind: 'EMAIL',
    pattern: /(?<value>[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})/g,
  },
  {
    kind: 'IP',
    pattern: new RegExp(
      String.raw`(?<value>(?<![\w.])${IPV4_ADDRESS}(?!\w|\.\d)|(?<![\w:])(?:${IPV6_FULL}|${IPV6_COMPRESSED})(?![\w:]|\.\d))`,
      'g',
    ),
    accepts: isAddress,
  },
];

/** Replaces sensitive identifiers with stable placeholders (IP-1, EMAIL-1, SECRET-1, USER-1). */
export function anonymizeLog(text: string): AnonymizeResult {
  const registry: Registry = { tokens: new Map(), counts: {} };
  const anonymized = RULES.reduce((current, rule) => applyRule(current, rule, registry), text);
  return { text: anonymized, replaced: { ...registry.counts } };
}

function applyRule(text: string, rule: Rule, registry: Registry): string {
  return text.replace(rule.pattern, (...args) => {
    const groups = args[args.length - 1] as { prefix?: string; value: string };
    if (rule.accepts && !rule.accepts(groups.value)) return args[0];
    return (groups.prefix ?? '') + placeholderFor(registry, rule.kind, groups.value);
  });
}

function placeholderFor(registry: Registry, kind: PlaceholderKind, value: string): string {
  const key = `${kind}:${normalizeValue(kind, value)}`;
  const known = registry.tokens.get(key);
  if (known) return known;
  const count = (registry.counts[kind] ?? 0) + 1;
  registry.counts[kind] = count;
  const token = `${kind}-${count}`;
  registry.tokens.set(key, token);
  return token;
}

// E-mail addresses and IPv6 groups differ only by case.
function normalizeValue(kind: PlaceholderKind, value: string): string {
  return kind === 'EMAIL' || kind === 'IP' ? value.toLowerCase() : value;
}

function isMixedCaseWithDigit(value: string): boolean {
  return /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}

// Without a digit, "bad::cafe" in C++ or PHP code would look like an IPv6 address.
function isAddress(value: string): boolean {
  return !value.includes(':') || /\d/.test(value);
}
