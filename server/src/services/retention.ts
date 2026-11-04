import { deleteAnalysesOlderThan } from '../repositories/analysisRepository';

/**
 * Logs and reports are kept for this many days, then deleted for everyone.
 * The privacy page states the same number: change both together.
 */
export const ANALYSIS_RETENTION_DAYS = 90;

/**
 * Deletes the analyses past the retention period. It runs on the analysis routes, because
 * the hosting has no scheduler of its own. Returns how many analyses were deleted.
 */
export function purgeExpiredAnalyses(): Promise<number> {
  return deleteAnalysesOlderThan(ANALYSIS_RETENTION_DAYS);
}
