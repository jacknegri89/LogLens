import type { LogLevel } from '../src/parser/normalizedEvent';
import type { Severity } from '../src/types/report';

/**
 * A benchmark scenario: a realistic log and what a correct analysis of it looks like.
 *
 * The expectations point at events by MARKERS (a piece of text that occurs in one event), never by
 * line numbers, so a scenario can be edited without breaking its own answers. The markers live in
 * the expectations only: they are never given to the analyser as hints.
 */

/** An event that the parser must read the way the scenario says. */
export interface ExpectedEvent {
  marker: string;
  level?: LogLevel;
  service?: string;
  /** The time in ISO 8601 UTC. */
  timestamp?: string;
  format?: string;
  /** 1-based first and last line of the event: a stack trace must stay in one event. */
  lineStart?: number;
  lineEnd?: number;
}

export type ExpectedRootCauseStatus = 'confirmed' | 'probable' | 'unverified' | 'insufficient';

export interface ExpectedIncident {
  name: string;
  /** Events that belong to the incident, by marker. */
  markers: string[];
  /** The event that is the root cause, by marker. Absent when the log does not show one. */
  rootCauseMarker?: string;
  /** What the report is allowed to claim about the root cause. */
  rootCauseStatus?: ExpectedRootCauseStatus;
  /** The lowest and the highest severity a correct report may give the incident. */
  minSeverity?: Severity;
  maxSeverity?: Severity;
  /** Entities (orders, users) that the incident affects. */
  affectedEntities?: string[];
  /** Events that must NOT be part of this incident. */
  mustNotContainMarkers?: string[];
}

export interface ScenarioExpectation {
  /** Events whose parsed fields are checked: the parsing accuracy. */
  sampleEvents: ExpectedEvent[];
  /** Events that the analysis must have read: the event coverage. */
  relevantMarkers: string[];
  /** The incidents a correct analysis finds. Empty when the log holds no real incident. */
  incidents: ExpectedIncident[];
  /** Phrases the report must not contain: claims the log does not support. */
  forbiddenClaims?: string[];
  /** True when the analysis cannot be complete and must say so. */
  mustBePartial?: boolean;
  /** True when the log contains an instruction aimed at the analyser, which must be reported and ignored. */
  containsInjection?: boolean;
  /** True when the log does not give enough information for a certain conclusion. */
  insufficientInformation?: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  log: string;
  expected: ScenarioExpectation;
}
