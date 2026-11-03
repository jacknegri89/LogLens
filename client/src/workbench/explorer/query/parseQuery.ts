export type Comparison = '>' | '>=' | '<' | '<=';

export type QueryTerm =
  | { kind: 'text'; needle: string; negated: boolean }
  | { kind: 'field'; field: string; needle: string; pattern: RegExp | null; negated: boolean }
  | { kind: 'compare'; field: string; comparison: Comparison; value: number; negated: boolean };

export interface ParsedQuery {
  /** Groups joined by OR; the terms inside a group are joined by AND. Empty means "everything". */
  groups: QueryTerm[][];
  /** Parts that could not be read as written and were searched as plain text instead. */
  unreadParts: string[];
}

interface Token {
  body: string;
  negated: boolean;
  quoted: boolean;
}

// An optional minus, then a "phrase" or a word that may end in a quoted value (field:"a b").
const TOKEN = /(-?)("[^"]*"?|[^\s"]+(?:"[^"]*"?)?)/g;
const FIELD = /^([A-Za-z_][\w.-]*):(.*)$/;
const COMPARISON = /^(>=|<=|>|<)(.*)$/;
const NUMBER = /^(-?\d+(?:\.\d+)?)(ms|s)?$/i;
const FIELD_ALIASES: Record<string, string> = { msg: 'message', latency_ms: 'latency' };
const LEVEL_ALIASES: Record<string, string> = {
  err: 'error',
  warning: 'warn',
  critical: 'fatal',
};

function unquote(text: string): string {
  return text.replace(/^"/, '').replace(/"$/, '');
}

/** Parentheses are not supported: they are dropped and reported, the terms still count. */
function withoutParentheses(body: string): string {
  return body.replace(/^\(+/, '').replace(/\)+$/, '');
}

function tokenize(input: string): Token[] {
  return Array.from(input.matchAll(TOKEN), ([, minus, body]) => ({
    body: body.startsWith('"') ? unquote(body) : withoutParentheses(unquote(body)),
    negated: minus === '-',
    quoted: body.startsWith('"'),
  })).filter((token) => token.body.trim() !== '' && token.body !== '-');
}

function hasParentheses(input: string): boolean {
  return /(^|\s)-?\(|\)(\s|$)/.test(input.replace(/"[^"]*"?/g, ''));
}

/** `*` matches anything; every other character is literal. */
function wildcardPattern(value: string): RegExp {
  const escaped = value.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function parseNumber(text: string): number | null {
  const match = text.match(NUMBER);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return match[2]?.toLowerCase() === 's' ? value * 1000 : value;
}

function textTerm(text: string, negated: boolean): QueryTerm {
  return { kind: 'text', needle: text.toLowerCase(), negated };
}

function compareTerm(field: string, value: string, negated: boolean): QueryTerm | null {
  const [, comparison, number] = value.match(COMPARISON) ?? [];
  const parsed = parseNumber(number ?? '');
  if (parsed === null) return null;
  return { kind: 'compare', field, comparison: comparison as Comparison, value: parsed, negated };
}

function matchTerm(field: string, value: string, negated: boolean): QueryTerm {
  const lower = value.toLowerCase();
  const needle = field === 'level' ? (LEVEL_ALIASES[lower] ?? lower) : lower;
  const pattern = needle.includes('*') ? wildcardPattern(needle) : null;
  return { kind: 'field', field, needle, pattern, negated };
}

/** A field:value term, or null when the token is not one (it is then plain text). */
function fieldTerm(token: Token): QueryTerm | null | 'unread' {
  const match = token.quoted ? null : token.body.match(FIELD);
  if (!match || match[2].startsWith('//')) return null;
  const field = FIELD_ALIASES[match[1].toLowerCase()] ?? match[1].toLowerCase();
  const value = unquote(match[2]);
  if (value === '') return 'unread';
  if (COMPARISON.test(value)) return compareTerm(field, value, token.negated) ?? 'unread';
  return matchTerm(field, value, token.negated);
}

function addToken(query: ParsedQuery, token: Token): void {
  const group = query.groups[query.groups.length - 1];
  const term = fieldTerm(token);
  if (term === 'unread') query.unreadParts.push(token.body);
  group.push(term && term !== 'unread' ? term : textTerm(token.body, token.negated));
}

/**
 * Reads a search such as `level:ERROR service:pay* latency:>200 -healthcheck "conn refused"`.
 * It never throws: parts it cannot read become plain text and are listed in `unreadParts`.
 */
export function parseQuery(input: string): ParsedQuery {
  const query: ParsedQuery = { groups: [[]], unreadParts: [] };
  for (const token of tokenize(input)) {
    const isOr = token.body === 'OR' && !token.negated && !token.quoted;
    if (isOr) query.groups.push([]);
    else addToken(query, token);
  }
  const hasLooseOr = query.groups.length > 1 && query.groups.some((group) => group.length === 0);
  if (hasLooseOr) query.unreadParts.push('OR');
  if (hasParentheses(input)) query.unreadParts.push('( )');
  query.groups = query.groups.filter((group) => group.length > 0);
  return query;
}
