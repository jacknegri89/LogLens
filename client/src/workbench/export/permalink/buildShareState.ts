import type { Language } from '../../../i18n/languages';
import { createAnonymizer } from '../../../lib/anonymize';
import type { AnalysisRecord, Finding, TimelineEntry } from '../../../lib/types';
import type { PermalinkState, SharedReport } from './permalinkState';

type Scrub = (text: string) => string;

function scrubFinding(finding: Finding, scrub: Scrub): Finding {
  return {
    ...finding,
    title: scrub(finding.title),
    category: scrub(finding.category),
    evidence: scrub(finding.evidence),
    ...(finding.technique !== undefined && { technique: scrub(finding.technique) }),
    ...(finding.owasp !== undefined && { owasp: scrub(finding.owasp) }),
  };
}

function scrubTimelineEntry(entry: TimelineEntry, scrub: Scrub): TimelineEntry {
  return {
    ...entry,
    title: scrub(entry.title),
    category: scrub(entry.category),
    evidence: scrub(entry.evidence),
    ...(entry.time !== undefined && { time: scrub(entry.time) }),
  };
}

function scrubReport(record: AnalysisRecord, scrub: Scrub): SharedReport {
  const { report } = record;
  return {
    title: scrub(record.title),
    severity: record.severity,
    category: scrub(record.category),
    report: {
      keyLines: report.keyLines.map(scrub),
      causes: report.causes.map(scrub),
      debugSteps: report.debugSteps.map(scrub),
      bugReportMarkdown: scrub(report.bugReportMarkdown),
      ...(report.format !== undefined && { format: scrub(report.format) }),
      ...(report.findings && {
        findings: report.findings.map((item) => scrubFinding(item, scrub)),
      }),
      ...(report.overview && { overview: report.overview.map(scrub) }),
      ...(report.timeline && {
        timeline: report.timeline.map((item) => scrubTimelineEntry(item, scrub)),
      }),
    },
  };
}

export interface ShareState {
  state: PermalinkState;
  /** Places in the log and the report that were replaced before sharing. */
  occurrences: number;
}

/**
 * The state to embed in a link. The log and every text of the report are anonymized with one
 * numbering, so IP-1 in the report is still IP-1 in the log. Detection is heuristic.
 */
export function buildShareState(
  language: Language,
  rawLog: string,
  record: AnalysisRecord | null,
): ShareState {
  const anonymizer = createAnonymizer();
  const log = anonymizer.anonymize(rawLog);
  let report: SharedReport | undefined;
  if (record) {
    report = scrubReport(record, anonymizer.anonymize);
  }
  return {
    state: { v: 1, language, log, ...(report && { report }) },
    occurrences: anonymizer.summary().occurrences,
  };
}
