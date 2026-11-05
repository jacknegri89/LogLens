import type { AnalysisRecord } from '../../../lib/types';
import type { PermalinkState } from './permalinkState';

/** The report of a share link as an analysis record, or null when the link carried no report. */
export function recordFromState(state: PermalinkState, now: Date): AnalysisRecord | null {
  if (!state.report) {
    return null;
  }
  return {
    id: 'share-link',
    createdAt: now.toISOString(),
    source: 'share-link',
    fileName: null,
    rawLog: state.log,
    title: state.report.title,
    severity: state.report.severity,
    category: state.report.category,
    report: state.report.report,
    helpful: null,
    shareToken: null,
  };
}
