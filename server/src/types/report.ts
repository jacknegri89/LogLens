/** How serious the detected problem is. */
export type Severity = 'informational' | 'low' | 'medium' | 'high' | 'critical';

/** One distinct problem found in the log, with the line that proves it. */
export interface Finding {
  title: string;
  severity: Severity;
  category: string;
  /** The first log line that matched. */
  evidence: string;
  /** MITRE ATT&CK technique, only for security findings. */
  technique?: string;
  /** OWASP Top 10 category, only where it fits. */
  owasp?: string;
}

/**
 * The structured part of an analysis that we store as JSON (the `report`
 * column). The `title`, `severity` and `category` live in their own columns
 * so we can list and filter by them; everything else lives here.
 *
 * This shape matches the JSON we ask the AI to return — see docs/prompts.md.
 */
export interface AnalysisReport {
  /** The most important raw log lines. */
  keyLines: string[];
  /** Probable root causes. */
  causes: string[];
  /** Concrete steps to investigate or fix the issue. */
  debugSteps: string[];
  /** A ready-to-paste GitHub Issue, in Markdown. */
  bugReportMarkdown: string;
  /** The detected log family, for example "Syslog". */
  format?: string;
  /** Distinct problems in the log, most severe first. */
  findings?: Finding[];
}
