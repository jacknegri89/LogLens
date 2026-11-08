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

/** Whether an event started a chain of failures, followed from one, or is unrelated to the others. */
export type TimelineRole = 'root' | 'effect' | 'independent';

/** One event of the incident in time order, with its place in the cause-to-effect chain. */
export interface TimelineEntry {
  /** The time as written in the evidence line; absent when the line has none. */
  time?: string;
  title: string;
  category: string;
  severity: Severity;
  role: TimelineRole;
  evidence: string;
  /** For an effect: the index, in the same list, of the entry that caused it. */
  causedBy?: number;
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
  /** The big picture: root cause against symptoms, order in time, shared actors. Each item is a short sentence. */
  overview?: string[];
  /** The events in time order with root cause and effects marked; only with at least two findings. */
  timeline?: TimelineEntry[];
  /** Every incident found, with its root cause, evidence and actions. No limit on how many. */
  incidents?: IncidentReport[];
  engine?: EngineInfo;
  coverage?: CoverageInfo;
  validation?: ValidationInfo;
  promptInjection?: InjectionAttempt[];
}

/** How much the log supports a root cause; the same four words in every report and every language. */
export type RootCauseStatus = 'confirmed' | 'probable' | 'unverified' | 'insufficient';

/** A quotation of the original log, with the lines it comes from, so the reader can open it. */
export interface ReportEvidence {
  eventId: string;
  /** 1-based line numbers of the original log. */
  lineStart: number;
  lineEnd: number;
  quote: string;
  /** Why this line supports the claim. */
  note?: string;
}

export interface IncidentRootCause {
  status: RootCauseStatus;
  /** What the cause is, in one sentence. For `insufficient` it says that the log does not show it. */
  summary: string;
  /** The kind of cause: a change, a failing dependency, an exception in the code, an attack. */
  kind: 'change' | 'dependency' | 'exception' | 'security' | 'unknown';
  /** The event that is the cause, absent when the log does not show one. */
  eventId?: string;
  /** How the analysis reasoned from the evidence to the cause. */
  reasoning?: string;
  evidence: ReportEvidence[];
  /** What speaks against the cause. Empty when nothing was found. */
  contradicting: string[];
  /** Other explanations that were considered, with their own status. */
  alternatives: { summary: string; status: RootCauseStatus; kind: IncidentRootCause['kind'] }[];
}

/** Measurable reasons for the confidence, never a bare percentage. */
export interface IncidentConfidence {
  level: 'high' | 'medium' | 'low';
  criteria: string[];
}

export type TimelineEntryRole = 'cause' | 'symptom' | 'context' | 'independent';

export interface IncidentTimelineEntry {
  eventId: string;
  lineStart: number;
  /** The time as the log wrote it; absent when the line has none. */
  time?: string;
  service?: string;
  title: string;
  role: TimelineEntryRole;
  /** The event that caused this one, when a link of at least probable certainty says so. */
  causedBy?: string;
}

export interface IncidentImpactReport {
  /** What the log shows happened. */
  observed: string[];
  /** What could happen if it is not fixed; never presented as having happened. */
  potential: string[];
  affectedEntities: string[];
  affectedServices: string[];
}

/** One distinct problem, with its cause, its evidence and what to do about it. */
export interface IncidentReport {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  /** Why the severity is what it is, from the real effect. */
  severityReasons: string[];
  description: string;
  rootCause: IncidentRootCause;
  confidence: IncidentConfidence;
  timeline: IncidentTimelineEntry[];
  /** Failures that are consequences of the root cause. */
  secondarySymptoms: ReportEvidence[];
  impact: IncidentImpactReport;
  immediateActions: string[];
  permanentFix: string[];
  preventiveMeasures: string[];
}

/** Which engine produced the report, said plainly. */
export interface EngineInfo {
  /** What the server is configured to use. */
  requested: 'mock' | 'rules' | 'openai' | 'hybrid' | 'ollama';
  /** What actually wrote the analysis text: `rules`, `openai`, `ollama` or `mock`. */
  used: string;
  /** True only when a language model really ran and its answer was used. */
  aiUsed: boolean;
  /** Why the requested engine was not used; null when it was. */
  fallbackReason: string | null;
  complexity: 'simple' | 'complex';
  complexityReasons: string[];
  /** How many incidents the model gave an assessment for. Zero with `aiUsed` means it added only text. */
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
  /** False when the analysis did not see everything: the report says so and never claims completeness. */
  complete: boolean;
  limits: { code: string; count: number }[];
}

export type ValidationIssueCode =
  | 'unknown-event'
  | 'quote-mismatch'
  | 'unknown-value'
  | 'certainty-downgraded'
  | 'dangerous-command'
  | 'missing-evidence';

/** What the Evidence Validator found wrong with the report and how it was handled. */
export interface ValidationIssue {
  code: ValidationIssueCode;
  incidentId?: string;
  detail: string;
}

export interface ValidationInfo {
  /** How many claims were checked against the log. */
  checked: number;
  issues: ValidationIssue[];
}

/** A line of the log that tried to give instructions to the analyser; reported, never obeyed. */
export interface InjectionAttempt {
  eventId: string;
  lineStart: number;
  quote: string;
}
