import type { Severity } from '../lib/types';

/** Text of the report shown after an analysis. */
export const REPORT_TEXT = {
  allFindings: 'All findings',
  techniqueLabel: 'MITRE ATT&CK',
  owaspLabel: 'OWASP',
  failingLines: 'Failing lines',
  probableCauses: 'Probable causes',
  debugSteps: 'Debug steps',
  githubIssue: 'GitHub issue',
  copyIssue: 'Copy GitHub issue',
  copiedIssue: 'Copied',
  downloadMarkdown: 'Download .md',
  showMarkdown: (lines: number) => `Show markdown (${lines} lines)`,
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critica',
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
  informational: 'Informativa',
};
