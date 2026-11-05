import { buildFindings } from '../ai/findings';
import { correlateIncident } from '../ai/correlation';
import type { AIReport } from '../ai/schema';
import type { Language } from '../types/language';
import type { Severity } from '../types/report';

/**
 * Adds the server's own correlation to a report from a model. The model is not trusted with the
 * big picture: its order of events and its links come from the same deterministic code the rules
 * engine uses. A report that already has an overview (from the rules engine) is returned as it is.
 */
export function addCorrelation(
  report: AIReport,
  excerpt: string,
  severityHint: Severity,
  language: Language,
): AIReport {
  if (report.overview !== undefined && report.overview.length > 0) {
    return report;
  }
  const findings = buildFindings(excerpt, severityHint, language);
  const correlation = correlateIncident(excerpt, findings, language);
  const result = { ...report };
  if (findings.length > 0) {
    result.findings = findings;
  }
  if (correlation.overview.length > 0) {
    result.overview = correlation.overview;
  }
  if (correlation.timeline.length > 0) {
    result.timeline = correlation.timeline;
  }
  return result;
}
