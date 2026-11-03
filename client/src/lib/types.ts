export type Severity = 'informational' | 'low' | 'medium' | 'high' | 'critical';

/** One distinct problem found in a log; `technique` is a MITRE ATT&CK id, `owasp` an OWASP category. */
export interface Finding {
  title: string;
  severity: Severity;
  category: string;
  evidence: string;
  technique?: string;
  owasp?: string;
}

export interface AnalysisReport {
  keyLines: string[];
  causes: string[];
  debugSteps: string[];
  bugReportMarkdown: string;
  /** Label of the detected log family, such as "Syslog". */
  format?: string;
  /** Ranked most severe first; only present when the log has at least two distinct events. */
  findings?: Finding[];
  /** Big picture of the incident: root cause versus symptoms, order of events, shared addresses. */
  overview?: string[];
}

/** Full analysis (matches GET /api/analyses/:id). */
export interface AnalysisRecord {
  id: string;
  createdAt: string;
  source: string;
  fileName: string | null;
  rawLog: string;
  title: string;
  severity: Severity;
  category: string;
  report: AnalysisReport;
  helpful: boolean | null;
  shareToken: string | null;
}

/** Read-only copy served through a share link (matches GET /api/shared/:token); it has no raw log. */
export interface SharedAnalysis {
  id: string;
  createdAt: string;
  title: string;
  severity: Severity;
  category: string;
  report: AnalysisReport;
}

/** What the report view needs: the raw log is optional because shared copies do not have it. */
export type ReportSource = SharedAnalysis & { rawLog?: string };

/** Lightweight row for the history list (matches GET /api/analyses). */
export interface AnalysisSummary {
  id: string;
  createdAt: string;
  source: string;
  title: string;
  severity: Severity;
  category: string;
}
