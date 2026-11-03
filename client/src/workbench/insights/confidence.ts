import type { Finding, TimelineEntry } from '../../lib/types';

export interface ConfidenceBreakdown {
  position: number;
  evidenceTerms: number;
  rootCause: number;
  corroboration: number;
}

export interface CauseConfidence {
  /** Position in the report's own list. */
  index: number;
  cause: string;
  /** Share of the confidence, 0 to 100 with at most one decimal. */
  percent: number;
  /** Points before normalising, so the page can show where the percentage comes from. */
  points: number;
  breakdown: ConfidenceBreakdown;
}

export interface ConfidenceResult {
  /** Highest confidence first; ties keep the report's order. */
  causes: CauseConfidence[];
  /** What is left when the top cause is capped and nothing else shares it: "something not listed". */
  otherPercent: number;
}

export interface ConfidenceInput {
  causes: string[];
  keyLines: string[];
  findings: Finding[];
  timeline: TimelineEntry[];
}

/*
 * Why a heuristic: the report lists causes in the order the rules engine trusts them, but gives
 * no probability. A fixed, readable formula turns that order and the evidence into a ranking
 * that a reader can audit; it is NOT a statistical model, and the page says so.
 *
 *   position       40, 32, 24, 16, then 8: the engine already put the likeliest cause first
 *   evidence terms +8 per specific word (a code, a number, a long identifier) the cause shares
 *                  with the evidence lines, +3 per plain word, at most +24
 *   root cause     +20 when the cause names the same specific thing as the timeline's root event
 *   corroboration  +5 per finding the cause also names, at most +15, only when two or more match
 *
 * Points become percentages of the total. The top cause is never shown above 95%: a log is
 * partial evidence, and certainty would be a lie.
 */
export const POSITION_START = 40;
export const POSITION_STEP = 8;
export const POSITION_FLOOR = 8;
export const SPECIFIC_TERM_POINTS = 8;
export const PLAIN_TERM_POINTS = 3;
export const EVIDENCE_TERMS_MAX = 24;
export const ROOT_CAUSE_POINTS = 20;
export const CORROBORATION_POINTS = 5;
export const CORROBORATION_MAX = 15;
export const TOP_CONFIDENCE_CAP = 95;

const TENTHS_IN_TOTAL = 1000;
const MIN_TERM_LENGTH = 4;
const SPECIFIC_TERM_LENGTH = 9;
const STOP_WORDS = new Set(
  (
    'that with from this have been when they your will into which there their than then only also ' +
    'some such more most other about after before could would should because while where being does ' +
    'just like make many over under same each both used uses using line lines root cause causes ' +
    'probable likely error errors failed failure warn warning info debug fatal true false null ' +
    'della delle degli nella sono come anche quando errore causa probabile'
  ).split(' '),
);
const ISO_TIME = /\d{4}-\d{2}-\d{2}t?[\d:.]*z?/gi;

/** Lower-case words of 4+ characters that say something: no stop words, no timestamps. */
export function significantTerms(text: string): Set<string> {
  const words =
    text
      .toLowerCase()
      .replace(ISO_TIME, ' ')
      .match(/[a-z0-9][a-z0-9_.:/-]*/g) ?? [];
  const terms = words
    .map((word) => word.replace(/[.:/-]+$/, ''))
    .filter((word) => word.length >= MIN_TERM_LENGTH && !STOP_WORDS.has(word));
  return new Set(terms);
}

/** A code, a number or a long identifier: the words that name one particular failure. */
export function isSpecificTerm(term: string): boolean {
  return /\d/.test(term) || term.length >= SPECIFIC_TERM_LENGTH;
}

function sharedTerms(first: Set<string>, second: Set<string>): string[] {
  return [...first].filter((term) => second.has(term));
}

function positionPoints(index: number): number {
  return Math.max(POSITION_FLOOR, POSITION_START - POSITION_STEP * index);
}

function evidencePoints(shared: string[]): number {
  const points = shared.reduce(
    (sum, term) => sum + (isSpecificTerm(term) ? SPECIFIC_TERM_POINTS : PLAIN_TERM_POINTS),
    0,
  );
  return Math.min(points, EVIDENCE_TERMS_MAX);
}

function rootEntries(timeline: TimelineEntry[]): TimelineEntry[] {
  return timeline.filter((entry) => entry.role === 'root');
}

function rootPoints(causeTerms: Set<string>, rootTerms: Set<string>): number {
  const shared = sharedTerms(causeTerms, rootTerms);
  return shared.some(isSpecificTerm) ? ROOT_CAUSE_POINTS : 0;
}

function corroborationPoints(causeTerms: Set<string>, findings: Finding[]): number {
  const matching = findings.filter((finding) => {
    const findingTerms = significantTerms(`${finding.title} ${finding.evidence}`);
    return sharedTerms(causeTerms, findingTerms).some(isSpecificTerm);
  });
  if (matching.length < 2) return 0;
  return Math.min(matching.length * CORROBORATION_POINTS, CORROBORATION_MAX);
}

function scoreCause(cause: string, index: number, input: ConfidenceInput): CauseConfidence {
  const causeTerms = significantTerms(cause);
  const evidenceText = [
    ...input.keyLines,
    ...rootEntries(input.timeline).map((entry) => entry.evidence),
  ];
  const rootText = rootEntries(input.timeline).map((entry) => `${entry.title} ${entry.evidence}`);
  const breakdown: ConfidenceBreakdown = {
    position: positionPoints(index),
    evidenceTerms: evidencePoints(
      sharedTerms(causeTerms, significantTerms(evidenceText.join(' '))),
    ),
    rootCause: rootPoints(causeTerms, significantTerms(rootText.join(' '))),
    corroboration: corroborationPoints(causeTerms, input.findings),
  };
  const points = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  return { index, cause, percent: 0, points, breakdown };
}

/** Splits `units` among the weights in proportion, whole units only, largest remainder first. */
export function shareUnits(weights: number[], units: number): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const exact = weights.map((weight) => (weight / total) * units);
  const shares = exact.map(Math.floor);
  const leftover = units - shares.reduce((sum, share) => sum + share, 0);
  const byRemainder = exact
    .map((value, position) => ({ position, remainder: value - Math.floor(value) }))
    .sort(
      (first, second) => second.remainder - first.remainder || first.position - second.position,
    );
  byRemainder.slice(0, leftover).forEach(({ position }) => (shares[position] += 1));
  return shares;
}

/** Tenths of a percent for each cause (best first) and for "something not listed". */
function distribute(points: number[]): { causes: number[]; other: number } {
  const causes = shareUnits(points, TENTHS_IN_TOTAL);
  const capUnits = TOP_CONFIDENCE_CAP * 10;
  if (causes[0] <= capUnits) return { causes, other: 0 };
  if (points.length === 1) return { causes: [capUnits], other: TENTHS_IN_TOTAL - capUnits };
  const rest = shareUnits(points.slice(1), TENTHS_IN_TOTAL - capUnits);
  return { causes: [capUnits, ...rest], other: 0 };
}

/**
 * The report's probable causes ranked by heuristic confidence. The percentages of the causes
 * plus `otherPercent` always add up to exactly 100.
 */
export function rankCauses(input: ConfidenceInput): ConfidenceResult {
  if (input.causes.length === 0) return { causes: [], otherPercent: 0 };
  const ranked = input.causes
    .map((cause, index) => scoreCause(cause, index, input))
    .sort((first, second) => second.points - first.points || first.index - second.index);
  const tenths = distribute(ranked.map((item) => item.points));
  return {
    causes: ranked.map((item, position) => ({ ...item, percent: tenths.causes[position] / 10 })),
    otherPercent: tenths.other / 10,
  };
}

/** The first sentence of a paragraph, for the plain-language line above the ranking. */
export function leadSentence(paragraph: string | undefined): string {
  const text = (paragraph ?? '').trim();
  return text.split(/(?<=[.!?])\s+/)[0] ?? '';
}
