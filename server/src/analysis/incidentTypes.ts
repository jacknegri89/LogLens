import type { Severity } from '../types/report';
import type { EvidenceRef } from './correlationTypes';

/**
 * What the analysis says about each incident, as data. Every claim carries the ids of the events
 * that support it, so the report and the Evidence Validator can check it against the log.
 */

/**
 * How much the log supports a root cause.
 * - `confirmed`: the log itself shows the cause and its effects (the changed value appears in the
 *   failures, the failures share identifiers) and nothing in it contradicts the chain.
 * - `probable`: the best explanation, but a step of the chain is inferred, not written in the log.
 * - `unverified`: a hypothesis worth checking; the log supports it only weakly.
 * - `insufficient`: the log shows the problem but not what caused it.
 */
export type RootCauseStatus = 'confirmed' | 'probable' | 'unverified' | 'insufficient';

/** Something in the log that speaks against a hypothesis. Rendered into words by the report layer. */
export interface Contradiction {
  /** The same kind of failure already appeared before the supposed cause. */
  code: 'failure-before-cause';
  eventId: string;
  /** The 1-based line of the event that contradicts. */
  line: number;
}

export type HypothesisKind = 'change' | 'dependency' | 'exception' | 'security' | 'unknown';

export interface Hypothesis {
  kind: HypothesisKind;
  /** The event that would be the cause. Null when the log does not show one. */
  sourceEventId: string | null;
  /** The message of the source event, or a fixed sentence when there is none. */
  summary: string;
  status: RootCauseStatus;
  /** The anomalies this hypothesis explains. */
  explainedEventIds: string[];
  supporting: EvidenceRef[];
  /** What speaks against the hypothesis. Empty when nothing does. */
  contradicting: Contradiction[];
  /** The links the hypothesis relies on. */
  linkIds: string[];
}

export type SecurityImpact = 'none' | 'attempt';

/** What the incident did, as far as the log shows it. */
export interface IncidentImpact {
  /** Orders and users that appear in the failures. */
  affectedEntities: string[];
  /** The orders where a payment was confirmed before the failure. */
  paidThenFailed: string[];
  failedEventCount: number;
  affectedServices: string[];
  /** The time from the first to the last event, when the log gives both. */
  durationMs: number | null;
  /** Server errors, refused connections or crashes: users could not use something. */
  availabilityLoss: boolean;
  /** Data lost or left inconsistent: a payment without its delivery, corrupted data. */
  integrityLoss: boolean;
  security: SecurityImpact;
}

export interface SeverityAssessment {
  severity: Severity;
  /** Short codes of what raised the severity, in English: "spread:5 entities", "integrity". */
  reasons: string[];
}

export interface Incident {
  id: string;
  title: string;
  category: string;
  /** Anomalies and changes that make up the incident. */
  anomalyEventIds: string[];
  /** The events that explain or surround it: payments, state changes of the same entity. */
  contextEventIds: string[];
  /** The anomalies that are consequences of the root cause, not the root cause itself. */
  symptomEventIds: string[];
  services: string[];
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  rootCause: Hypothesis;
  alternatives: Hypothesis[];
  impact: IncidentImpact;
  severity: SeverityAssessment;
  /** The links between the events of the incident. */
  linkIds: string[];
  /** True when some failures were put together only because they happened seconds apart in one place. */
  groupedByTime: boolean;
}
