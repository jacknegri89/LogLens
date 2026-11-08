import type { AnalysisCoverage } from './contextSelection';
import type { Incident } from './incidentTypes';

/**
 * Decides whether a log needs a model or whether the rules are enough. A log with one failure in
 * one service is simple: the rules explain it and calling a model would only cost money. A log
 * where several services fail, a change precedes the failures, the cause is not settled or the
 * analysis is partial is complex: the rules found the signals, a model reasons about the chain.
 *
 * A known rule never makes an incident simple. Only the shape of the incident does.
 */

export type ComplexityReason =
  | 'multiple-services'
  | 'change-before-failures'
  | 'several-incidents'
  | 'many-failures'
  | 'cause-not-confirmed'
  | 'competing-hypotheses'
  | 'partial-analysis';

export interface ComplexityAssessment {
  level: 'simple' | 'complex';
  reasons: ComplexityReason[];
}

/** An incident with more failures than this is a chain to read, not one error to look up. */
const MANY_FAILURES = 3;
const SEVERAL_INCIDENTS = 2;

function reasonsForIncident(incident: Incident): ComplexityReason[] {
  const reasons: ComplexityReason[] = [];
  if (incident.services.length >= 2) {
    reasons.push('multiple-services');
  }
  if (incident.rootCause.kind === 'change') {
    reasons.push('change-before-failures');
  }
  if (incident.anomalyEventIds.length > MANY_FAILURES) {
    reasons.push('many-failures');
  }
  const undecided =
    incident.rootCause.status === 'unverified' || incident.rootCause.status === 'probable';
  if (undecided && incident.anomalyEventIds.length > 1) {
    reasons.push('cause-not-confirmed');
  }
  const rivals = incident.alternatives.filter(
    (alternative) => alternative.status === 'probable' || alternative.status === 'confirmed',
  );
  if (rivals.length > 0) {
    reasons.push('competing-hypotheses');
  }
  return reasons;
}

export function evaluateComplexity(
  incidents: Incident[],
  coverage: AnalysisCoverage,
): ComplexityAssessment {
  const reasons = new Set<ComplexityReason>();
  if (incidents.length >= SEVERAL_INCIDENTS) {
    reasons.add('several-incidents');
  }
  for (const incident of incidents) {
    reasonsForIncident(incident).forEach((reason) => reasons.add(reason));
  }
  if (!coverage.complete) {
    reasons.add('partial-analysis');
  }
  const list = [...reasons];
  if (list.length === 0) {
    return { level: 'simple', reasons: [] };
  }
  return { level: 'complex', reasons: list };
}
