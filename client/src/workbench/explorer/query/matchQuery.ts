import type { ParsedLine } from '../../types';
import type { ParsedQuery, QueryTerm } from './parseQuery';

function fieldValue(line: ParsedLine, field: string): string | null {
  if (field === 'level') return line.level;
  if (field === 'service') return line.service;
  if (field === 'message') return line.message;
  if (field === 'latency') return line.latencyMs === null ? null : String(line.latencyMs);
  return line.fields[field] ?? null;
}

function compare(actual: number, term: Extract<QueryTerm, { kind: 'compare' }>): boolean {
  if (term.comparison === '>') return actual > term.value;
  if (term.comparison === '>=') return actual >= term.value;
  if (term.comparison === '<') return actual < term.value;
  return actual <= term.value;
}

function matchesField(line: ParsedLine, term: Extract<QueryTerm, { kind: 'field' }>): boolean {
  const value = fieldValue(line, term.field);
  if (value === null) return false;
  if (term.pattern) return term.pattern.test(value);
  const lower = value.toLowerCase();
  // A message is long prose: searching inside it is what people mean.
  return term.field === 'message' ? lower.includes(term.needle) : lower === term.needle;
}

function matchesTerm(line: ParsedLine, term: QueryTerm): boolean {
  if (term.kind === 'text') return line.raw.toLowerCase().includes(term.needle);
  if (term.kind === 'field') return matchesField(line, term);
  const value = Number.parseFloat(fieldValue(line, term.field) ?? '');
  return !Number.isNaN(value) && compare(value, term);
}

/** True when the line satisfies every term of at least one OR group (or the query is empty). */
export function matchesQuery(line: ParsedLine, query: ParsedQuery): boolean {
  if (query.groups.length === 0) return true;
  return query.groups.some((group) =>
    group.every((term) => matchesTerm(line, term) !== term.negated),
  );
}

/**
 * The positions (in `lines`) of the lines that match, in order. `allowed` narrows the search
 * further, such as to fault lines only.
 */
export function filterLines(
  lines: readonly ParsedLine[],
  query: ParsedQuery,
  allowed: ((position: number) => boolean) | null = null,
): number[] {
  const positions: number[] = [];
  lines.forEach((line, position) => {
    if ((!allowed || allowed(position)) && matchesQuery(line, query)) positions.push(position);
  });
  return positions;
}

function longestLiteral(pattern: string): string {
  return pattern
    .split('*')
    .reduce((longest, part) => (part.length > longest.length ? part : longest), '');
}

/** The words worth marking in a matching row: positive text terms and searched field values. */
export function highlightTerms(query: ParsedQuery): string[] {
  const terms = new Set<string>();
  for (const term of query.groups.flat()) {
    if (term.negated || term.kind === 'compare') continue;
    if (term.kind === 'text') terms.add(term.needle);
    else if (term.field !== 'level' && term.field !== 'service')
      terms.add(longestLiteral(term.needle));
  }
  return [...terms].filter((term) => term.length >= 2);
}
