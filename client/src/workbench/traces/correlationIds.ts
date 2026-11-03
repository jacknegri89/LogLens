import type { ParsedLine } from '../types';

export type CorrelationKind = 'trace' | 'correlation' | 'request' | 'order' | 'session' | 'pattern';

/** Most specific first: when one id is seen under two kinds, the earlier kind names it. */
const KIND_PRIORITY: readonly CorrelationKind[] = [
  'trace',
  'correlation',
  'request',
  'order',
  'session',
  'pattern',
];

/** Field names (lower-cased, as the parser stores them). A nested name such as `ctx.trace_id` matches too. */
const FIELD_KINDS: Record<string, CorrelationKind> = {
  trace_id: 'trace',
  traceid: 'trace',
  'trace.id': 'trace',
  'span.trace_id': 'trace',
  request_id: 'request',
  requestid: 'request',
  'x-request-id': 'request',
  'x-correlation-id': 'correlation',
  correlation_id: 'correlation',
  correlationid: 'correlation',
  session_id: 'session',
  sessionid: 'session',
  order_id: 'order',
  orderid: 'order',
};

const EMPTY_VALUES = new Set(['', '-', 'null', 'undefined', 'none', 'nil', 'n/a', '0', 'false']);
const MIN_ID_LENGTH = 2;
const MAX_ID_LENGTH = 128;
const LABELLED_ID =
  /\b(?:trace|traceid|trace_id|req|request|correlation)[ _-]?(?:id)?\s*[:=]\s*([\w-]{6,64})/gi;
const REQUEST_PREFIX = /\b(req[-_][A-Za-z0-9]{4,})\b/g;
const BRACKETED_ID = /\[([A-Za-z0-9]{8,32})\]/g;

export interface LineIdMatch {
  kind: CorrelationKind;
  id: string;
  /** A guess from the message text: it only counts when the same id shows on two lines. */
  needsRepeat: boolean;
}

export interface Correlation {
  id: string;
  kind: CorrelationKind;
  /** Positions in the `lines` array, in log order. */
  positions: number[];
  services: string[];
  faultCount: number;
  firstTimestamp: number | null;
  lastTimestamp: number | null;
  /** Time between the first and last timed line, or null with fewer than two. */
  durationMs: number | null;
}

function isUsableId(value: string): boolean {
  const id = value.trim();
  return (
    id.length >= MIN_ID_LENGTH && id.length <= MAX_ID_LENGTH && !EMPTY_VALUES.has(id.toLowerCase())
  );
}

function kindOfField(key: string): CorrelationKind | null {
  if (key in FIELD_KINDS) return FIELD_KINDS[key];
  const lastDot = key.lastIndexOf('.');
  return lastDot > 0 ? (FIELD_KINDS[key.slice(lastDot + 1)] ?? null) : null;
}

function idsFromFields(fields: Record<string, string>): LineIdMatch[] {
  const matches: LineIdMatch[] = [];
  for (const [key, value] of Object.entries(fields)) {
    const kind = kindOfField(key);
    if (kind && isUsableId(value)) matches.push({ kind, id: value.trim(), needsRepeat: false });
  }
  return matches;
}

function looksLikeOpaqueId(candidate: string): boolean {
  return /\d/.test(candidate) && /[A-Za-z]/.test(candidate);
}

function idsFromMessage(raw: string): LineIdMatch[] {
  const matches: LineIdMatch[] = [];
  for (const [, id] of raw.matchAll(LABELLED_ID)) {
    matches.push({ kind: 'trace', id, needsRepeat: false });
  }
  for (const [, id] of raw.matchAll(REQUEST_PREFIX)) {
    matches.push({ kind: 'request', id, needsRepeat: false });
  }
  for (const [, id] of raw.matchAll(BRACKETED_ID)) {
    if (looksLikeOpaqueId(id)) matches.push({ kind: 'pattern', id, needsRepeat: true });
  }
  return matches;
}

/** Every id a single line carries, each once. Ids from fields come before ids from the text. */
export function extractLineIds(line: ParsedLine): LineIdMatch[] {
  const seen = new Set<string>();
  return [...idsFromFields(line.fields), ...idsFromMessage(line.raw)].filter((match) => {
    if (seen.has(match.id)) return false;
    seen.add(match.id);
    return true;
  });
}

interface Draft {
  id: string;
  kind: CorrelationKind;
  positions: number[];
  confirmed: boolean;
}

function collectDrafts(lines: readonly ParsedLine[]): Map<string, Draft> {
  const drafts = new Map<string, Draft>();
  lines.forEach((line, position) => {
    for (const match of extractLineIds(line)) {
      const draft = drafts.get(match.id) ?? {
        id: match.id,
        kind: match.kind,
        positions: [],
        confirmed: false,
      };
      if (KIND_PRIORITY.indexOf(match.kind) < KIND_PRIORITY.indexOf(draft.kind))
        draft.kind = match.kind;
      draft.confirmed ||= !match.needsRepeat;
      draft.positions.push(position);
      drafts.set(match.id, draft);
    }
  });
  return drafts;
}

function timeRange(members: readonly ParsedLine[]): {
  first: number | null;
  last: number | null;
  timed: number;
} {
  let first: number | null = null;
  let last: number | null = null;
  let timed = 0;
  for (const { timestamp } of members) {
    if (timestamp === null) continue;
    timed += 1;
    first = first === null ? timestamp : Math.min(first, timestamp);
    last = last === null ? timestamp : Math.max(last, timestamp);
  }
  return { first, last, timed };
}

function summarize(draft: Draft, lines: readonly ParsedLine[]): Correlation {
  const members = draft.positions.map((position) => lines[position]);
  const { first, last, timed } = timeRange(members);
  const services = members.map((line) => line.service).filter((s): s is string => s !== null);
  return {
    id: draft.id,
    kind: draft.kind,
    positions: draft.positions,
    services: [...new Set(services)],
    faultCount: members.filter((line) => line.isFault).length,
    firstTimestamp: first,
    lastTimestamp: last,
    durationMs: timed >= 2 && first !== null && last !== null ? last - first : null,
  };
}

/** Faults first, then the most lines, then by name so the order is stable. */
export function compareCorrelations(first: Correlation, second: Correlation): number {
  return (
    Number(second.faultCount > 0) - Number(first.faultCount > 0) ||
    second.positions.length - first.positions.length ||
    first.id.localeCompare(second.id)
  );
}

/** The ids found in the log with the lines that carry them. A guessed id needs two lines to count. */
export function buildCorrelations(lines: readonly ParsedLine[]): Correlation[] {
  const found: Correlation[] = [];
  for (const draft of collectDrafts(lines).values()) {
    if (draft.confirmed || draft.positions.length >= 2) found.push(summarize(draft, lines));
  }
  return found.sort(compareCorrelations);
}
