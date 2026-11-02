import type { Severity } from '../lib/types';

/** Text of the report shown after an analysis. */
export const REPORT_TEXT = {
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
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
