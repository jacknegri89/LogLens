import type { Severity, TimelineEntry } from '../lib/types';

/** Text of the report shown after an analysis: a case file on the investigator's desk. */
export const REPORT_TEXT = {
  caseFile: 'Case file',
  caseNumber: (id: string) => `No. ${id.slice(0, 8).toUpperCase()}`,
  caseTitleLabel: 'What failed',
  severityStamp: 'Severity',
  bigPicture: 'Case summary',
  evidenceBoard: 'Evidence board',
  evidenceBoardHint:
    'Red thread: from the event that started it to what it set off. Cards without a pin had no link to the rest.',
  evidenceTag: (index: number) => `E${index + 1}`,
  evidenceTagLabel: (index: number) => `Evidence ${index + 1}`,
  noTime: 'no time',
  allFindings: 'All findings',
  techniqueLabel: 'MITRE ATT&CK',
  owaspLabel: 'OWASP',
  failingLines: 'Failing lines',
  failingLinesLabel: 'Failing lines of the log; scroll sideways to read long lines',
  probableCauses: 'Probable causes',
  debugSteps: 'Debug steps',
  githubIssue: 'GitHub issue',
  githubIssueHint: 'A ready-to-paste bug report with the lines, causes and steps above.',
  copyIssue: 'Copy GitHub issue',
  copiedIssue: 'Copied',
  downloadMarkdown: 'Download .md',
  showMarkdown: (lines: number) => `Show markdown (${lines} lines)`,
};

/** The note under each evidence card: where it sits in the chain of events. */
export const ROLE_LABEL: Record<TimelineEntry['role'], string> = {
  root: 'Root cause',
  effect: 'Effect',
  independent: 'No link found',
};

/** Shown on an effect card when its cause is known, such as "Set off by E1". */
export const causedByLabel = (rootIndex: number) => `Set off by E${rootIndex + 1}`;

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critica',
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
  informational: 'Informativa',
};
