import type { Finding, Severity, TimelineEntry } from '../../lib/types';
import type { ParsedLine } from '../types';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'severe';
export type RiskFactorId =
  | 'severity'
  | 'faultRatio'
  | 'findings'
  | 'rootCause'
  | 'security'
  | 'burst';

export interface RiskFactor {
  id: RiskFactorId;
  points: number;
  /** The most this factor can add, so the page can show "4 of 10". */
  maxPoints: number;
  /** The number behind the points: weight, percent of fault lines, count of findings... */
  value: number;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  /** Points before the cap at 100, so a capped score is still explained. */
  rawScore: number;
  factors: RiskFactor[];
}

export interface RiskInput {
  severity: Severity;
  category: string;
  lines: ParsedLine[];
  findings: Finding[];
  timeline: TimelineEntry[];
}

/*
 * The anomaly risk score is a fixed sum, never a model, so the same log always gets the
 * same number and the page can list every point:
 *   severity weight (5 / 20 / 40 / 65 / 85)       what the analysis decided
 * + fault lines / all lines x 10                   how much of the log is failing
 * + 1 per distinct finding, up to 5                how many separate problems
 * + 5 when a root cause has downstream effects     one failure that spreads
 * + 5 for a security finding                       someone may be acting on purpose
 * + 5 when 5 or more faults fall inside 10 seconds a burst, not a slow trickle
 * The total is capped at 100.
 */
export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  informational: 5,
  low: 20,
  medium: 40,
  high: 65,
  critical: 85,
};
const FAULT_RATIO_MAX = 10;
const FINDINGS_MAX = 5;
const FLAT_FACTOR_POINTS = 5;
export const BURST_FAULT_COUNT = 5;
export const BURST_WINDOW_MS = 10_000;
const SECURITY_CATEGORY = 'Security Attack';

/** Lower bound of each level; the first one whose bound the score reaches. */
const LEVEL_BOUNDS: [RiskLevel, number][] = [
  ['severe', 80],
  ['high', 55],
  ['moderate', 30],
  ['low', 0],
];

export function riskLevel(score: number): RiskLevel {
  return LEVEL_BOUNDS.find(([, lowest]) => score >= lowest)?.[0] ?? 'low';
}

/**
 * How many separate bursts of faults the log holds: `BURST_FAULT_COUNT` timed faults inside
 * `BURST_WINDOW_MS`. Faults without a readable time cannot be placed, so they never count.
 */
export function countErrorBursts(lines: ParsedLine[]): number {
  const times = lines
    .filter((line) => line.isFault && line.timestamp !== null)
    .map((line) => line.timestamp as number)
    .sort((first, second) => first - second);
  let bursts = 0;
  let start = 0;
  while (start + BURST_FAULT_COUNT <= times.length) {
    const lastInWindow = start + BURST_FAULT_COUNT - 1;
    if (times[lastInWindow] - times[start] > BURST_WINDOW_MS) {
      start += 1;
      continue;
    }
    bursts += 1;
    start = endOfBurst(times, lastInWindow) + 1;
  }
  return bursts;
}

/** A burst goes on while the next fault follows the previous one within the window. */
function endOfBurst(times: number[], from: number): number {
  let end = from;
  while (end + 1 < times.length && times[end + 1] - times[end] <= BURST_WINDOW_MS) end += 1;
  return end;
}

/** True when a timeline root caused at least one effect. */
export function hasSpreadingRoot(timeline: TimelineEntry[]): boolean {
  return timeline.some(
    (entry, index) => entry.role === 'root' && timeline.some((other) => other.causedBy === index),
  );
}

function isSecurity(input: RiskInput): boolean {
  return (
    input.category === SECURITY_CATEGORY ||
    input.findings.some((finding) => finding.category === SECURITY_CATEGORY)
  );
}

function faultPercent(lines: ParsedLine[]): number {
  if (lines.length === 0) {
    return 0;
  }
  const faults = lines.filter((line) => line.isFault).length;
  return Math.round((faults / lines.length) * 100);
}

function factor(id: RiskFactorId, points: number, maxPoints: number, value: number): RiskFactor {
  return { id, points, maxPoints, value };
}

function buildFactors(input: RiskInput): RiskFactor[] {
  const percent = faultPercent(input.lines);
  const findingCount = input.findings.length;
  const flat = (id: RiskFactorId, active: boolean, value: number) => {
    let points = 0;
    if (active) {
      points = FLAT_FACTOR_POINTS;
    }
    return factor(id, points, FLAT_FACTOR_POINTS, value);
  };
  return [
    factor(
      'severity',
      SEVERITY_WEIGHTS[input.severity],
      SEVERITY_WEIGHTS.critical,
      SEVERITY_WEIGHTS[input.severity],
    ),
    factor('faultRatio', Math.round((percent / 100) * FAULT_RATIO_MAX), FAULT_RATIO_MAX, percent),
    factor('findings', Math.min(findingCount, FINDINGS_MAX), FINDINGS_MAX, findingCount),
    flat(
      'rootCause',
      hasSpreadingRoot(input.timeline),
      input.timeline.filter((entry) => entry.role === 'effect').length,
    ),
    flat(
      'security',
      isSecurity(input),
      input.findings.filter((item) => item.category === SECURITY_CATEGORY).length,
    ),
    flat('burst', countErrorBursts(input.lines) > 0, countErrorBursts(input.lines)),
  ];
}

/** The 0-100 risk of the incident and the points that make it up. */
export function computeRisk(input: RiskInput): RiskAssessment {
  const factors = buildFactors(input);
  const rawScore = factors.reduce((sum, item) => sum + item.points, 0);
  const score = Math.min(100, Math.max(0, rawScore));
  return { score, level: riskLevel(score), rawScore, factors };
}
