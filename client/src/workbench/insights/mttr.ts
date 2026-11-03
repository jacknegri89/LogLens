import type { Severity } from '../../lib/types';

export interface MinutesRange {
  min: number;
  max: number;
}

/**
 * Rule-of-thumb time to restore service for a MEDIUM incident of each category, in minutes.
 * These are common industry ballparks and not measurements of the visitor's team: the page
 * always labels the result as an estimate. A category not listed uses `DEFAULT_RANGE`.
 */
export const MEDIUM_RANGE_BY_CATEGORY: Record<string, MinutesRange> = {
  database: { min: 10, max: 30 },
  'database connection failure': { min: 10, max: 30 },
  network: { min: 10, max: 30 },
  infrastructure: { min: 15, max: 45 },
  runtime: { min: 15, max: 45 },
  'server error': { min: 15, max: 45 },
  'client error': { min: 5, max: 20 },
  'security attack': { min: 15, max: 60 },
  authentication: { min: 10, max: 40 },
  'access denied': { min: 10, max: 40 },
  permissions: { min: 10, max: 30 },
  'rate limit': { min: 5, max: 20 },
  build: { min: 10, max: 30 },
  filesystem: { min: 10, max: 30 },
};

export const DEFAULT_RANGE: MinutesRange = { min: 15, max: 45 };

/** A more severe incident usually takes longer: it is wider, harder to isolate and gets more care. */
export const SEVERITY_FACTORS: Record<Severity, number> = {
  informational: 0.25,
  low: 0.5,
  medium: 1,
  high: 2,
  critical: 4,
};

const ROUNDING_STEP = 5;

function roundToStep(minutes: number): number {
  return Math.max(ROUNDING_STEP, Math.round(minutes / ROUNDING_STEP) * ROUNDING_STEP);
}

/** The estimated time to restore, as a range of minutes rounded to 5. */
export function estimateMttr(category: string, severity: Severity): MinutesRange {
  const base = MEDIUM_RANGE_BY_CATEGORY[category.trim().toLowerCase()] ?? DEFAULT_RANGE;
  const factor = SEVERITY_FACTORS[severity];
  return { min: roundToStep(base.min * factor), max: roundToStep(base.max * factor) };
}
