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

/** One event of the incident in time order; `causedBy` is the index of the root entry in the same array. */
export interface TimelineEntry {
  /** Time as written in the evidence line, absent when the line has none. */
  time?: string;
  title: string;
  category: string;
  severity: Severity;
  role: 'root' | 'effect' | 'independent';
  evidence: string;
  causedBy?: number;
}

/** How much the log supports a root cause. */
export type RootCauseStatus = 'confirmed' | 'probable' | 'unverified' | 'insufficient';

/** A quotation of the original log with the lines it comes from (1-based). */
export interface ReportEvidence {
  eventId: string;
  lineStart: number;
  lineEnd: number;
  quote: string;
  note?: string;
}

export type CauseKind = 'change' | 'dependency' | 'exception' | 'security' | 'unknown';

export interface IncidentRootCause {
  status: RootCauseStatus;
  kind: CauseKind;
  summary: string;
  eventId?: string;
  reasoning?: string;
  evidence: ReportEvidence[];
  contradicting: string[];
  alternatives: { summary: string; status: RootCauseStatus; kind: CauseKind }[];
}

export interface IncidentTimelineEntry {
  eventId: string;
  lineStart: number;
  time?: string;
  service?: string;
  title: string;
  role: 'cause' | 'symptom' | 'context' | 'independent';
  /** The id of the event that caused this one. */
  causedBy?: string;
}

/** One distinct problem with its root cause, evidence, timeline and actions. */
export interface Incident {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  severityReasons: string[];
  description: string;
  rootCause: IncidentRootCause;
  confidence: { level: 'high' | 'medium' | 'low'; criteria: string[] };
  timeline: IncidentTimelineEntry[];
  secondarySymptoms: ReportEvidence[];
  impact: {
    observed: string[];
    potential: string[];
    affectedEntities: string[];
    affectedServices: string[];
  };
  immediateActions: string[];
  permanentFix: string[];
  preventiveMeasures: string[];
}

/** Which engine wrote the analysis. `aiUsed` is true only when a language model really answered. */
export interface EngineInfo {
  requested: string;
  used: string;
  aiUsed: boolean;
  fallbackReason: string | null;
  complexity: 'simple' | 'complex';
  complexityReasons: string[];
  /** How many incidents the model assessed; zero with `aiUsed` means it added only text. */
  assessedIncidents: number;
}

export interface CoverageInfo {
  totalLines: number;
  acquiredEvents: number;
  notAcquired: number;
  selectedEvents: number;
  ignoredRoutine: number;
  notSelected: number;
  cutByBudget: number;
  /** False when the analysis did not see everything. */
  complete: boolean;
  limits: { code: string; count: number }[];
}

export interface ValidationInfo {
  checked: number;
  issues: { code: string; incidentId?: string; detail: string }[];
}

/** A line of the log that tried to give orders to the analyser. */
export interface InjectionAttempt {
  eventId: string;
  lineStart: number;
  quote: string;
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
  /** Cause-to-effect chain of the events, from the correlation layer; only present with at least two findings. */
  timeline?: TimelineEntry[];
  /** Every incident found; absent in reports made before the correlation engine. */
  incidents?: Incident[];
  engine?: EngineInfo;
  coverage?: CoverageInfo;
  validation?: ValidationInfo;
  promptInjection?: InjectionAttempt[];
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
  /** Set only on a copy kept in this browser whose log was cut to fit; the server never sends it. */
  logTruncated?: boolean;
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
