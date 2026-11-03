import type { Language } from '../../../i18n/languages';
import { createAnonymizer } from '../../../lib/anonymize';
import type { AnalysisRecord, Finding, TimelineEntry } from '../../../lib/types';
import type { PermalinkState, SharedReport } from './permalinkState';

type Scrub = (text: string) => string;

function scrubFinding(finding: Finding, scrub: Scrub): Finding {
  return { ...finding, title: scrub(finding.title), evidence: scrub(finding.evidence) };
}

function scrubTimelineEntry(entry: TimelineEntry, scrub: Scrub): TimelineEntry {
  return { ...entry, title: scrub(entry.title), evidence: scrub(entry.evidence) };
}

function scrubReport(record: AnalysisRecord, scrub: Scrub): SharedReport {
  const { report } = record;
  return {
    title: scrub(record.title),
    severity: record.severity,
    category: record.category,
    report: {
      keyLines: report.keyLines.map(scrub),
      causes: report.causes.map(scrub),
      debugSteps: report.debugSteps.map(scrub),
      bugReportMarkdown: scrub(report.bugReportMarkdown),
      ...(report.format !== undefined && { format: report.format }),
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
 * numbering, so IP-1 in the report is still IP-1 in the log. The link never holds the original text.
 */
export function buildShareState(
  language: Language,
  rawLog: string,
  record: AnalysisRecord | null,
): ShareState {
  const anonymizer = createAnonymizer();
  const log = anonymizer.anonymize(rawLog);
  const report = record ? scrubReport(record, anonymizer.anonymize) : undefined;
  return {
    state: { v: 1, language, log, ...(report && { report }) },
    occurrences: anonymizer.summary().occurrences,
  };
}
