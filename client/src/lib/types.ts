export type Severity = 'low' | 'medium' | 'high';

export interface AnalysisReport {
  keyLines: string[];
  causes: string[];
  debugSteps: string[];
  bugReportMarkdown: string;
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
}

/** Lightweight row for the history list (matches GET /api/analyses). */
export interface AnalysisSummary {
  id: string;
  createdAt: string;
  source: string;
  title: string;
  severity: Severity;
  category: string;
}
