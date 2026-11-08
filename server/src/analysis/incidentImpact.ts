import { pickRule, raiseSeverity, SEVERITY_ORDER } from '../ai/ruleMatching';
import type { Severity } from '../types/report';
import type { SelectedEvent } from './contextSelection';
import type { OrderedEvent } from './eventOrdering';
import type { IncidentImpact, SeverityAssessment } from './incidentTypes';

/**
 * What an incident did and how serious it is. The severity is not the level of the loudest line:
 * it comes from the real effect (how many users or orders, how many services, whether something
 * became unavailable or inconsistent, whether it was an attack) and from nothing else.
 */

const PAYMENT_DONE =
  /payment\s+(?:confirmed|captured|succeeded|received|completed|authori[sz]ed)|\border\s+paid\b/i;
const UNAVAILABILITY =
  /unavailable|connection refused|econnrefused|out of memory|\boom\b|crash|panic|fatal/i;
const DATA_DAMAGE = /data loss|corrupt|inconsistent|lost update|rollback failed/i;

/** Spread: how many entities or services an incident touches before it counts as wide. */
const WIDE_ENTITY_COUNT = 5;
const WIDE_SERVICE_COUNT = 3;
const SEVERAL_ENTITY_COUNT = 2;

/** Points per effect; the thresholds below turn the total into a severity. */
const POINTS_HIGH_ANOMALY = 2;
const POINTS_MEDIUM_ANOMALY = 1;
const POINTS_WIDE = 2;
const POINTS_SEVERAL = 1;
const POINTS_INTEGRITY = 2;
const POINTS_AVAILABILITY = 1;
const POINTS_SECURITY_ATTEMPT = 1;

const CRITICAL_FROM = 8;
const HIGH_FROM = 5;
const MEDIUM_FROM = 2;

function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== null))];
}

function orderIdsAfterPayment(events: OrderedEvent[], anomalyIds: Set<string>): string[] {
  const paidAt = new Map<string, number>();
  for (const entry of events) {
    const orderId = entry.event.orderId;
    if (orderId !== null && PAYMENT_DONE.test(entry.event.message) && !paidAt.has(orderId)) {
      paidAt.set(orderId, entry.position);
    }
  }
  const failed: string[] = [];
  for (const entry of events) {
    const orderId = entry.event.orderId;
    const paidPosition = paidAt.get(orderId ?? '');
    const failsAfterPayment =
      orderId !== null &&
      paidPosition !== undefined &&
      anomalyIds.has(entry.event.eventId) &&
      entry.position > paidPosition;
    if (failsAfterPayment && !failed.includes(orderId)) {
      failed.push(orderId);
    }
  }
  return failed;
}

/** A known rule that maps to MITRE ATT&CK or OWASP describes an adversary: failed logins, scanners. */
function describesAdversary(entry: OrderedEvent): boolean {
  const rule = pickRule(entry.event.raw.slice(0, 800));
  return rule.mitre !== undefined || rule.owasp !== undefined;
}

function durationOf(events: OrderedEvent[]): number | null {
  const times = events
    .map((entry) => entry.event.epochMs)
    .filter((value): value is number => value !== null);
  if (times.length < 2) {
    return null;
  }
  return Math.max(...times) - Math.min(...times);
}

function lossesAvailability(anomalies: OrderedEvent[]): boolean {
  return anomalies.some((entry) => {
    const status = entry.event.statusCode;
    return (
      entry.event.level === 'fatal' ||
      (status !== null && status >= 500) ||
      UNAVAILABILITY.test(entry.event.message)
    );
  });
}

/**
 * @param events every event of the incident, in time order: anomalies and their context
 * @param anomalies the failures among them
 */
export function assessImpact(
  events: OrderedEvent[],
  anomalies: OrderedEvent[],
  selectedById: Map<string, SelectedEvent>,
): IncidentImpact {
  const anomalyIds = new Set(anomalies.map((entry) => entry.event.eventId));
  const orders = distinct(events.map((entry) => entry.event.orderId));
  const paidThenFailed = orderIdsAfterPayment(events, anomalyIds);
  const damagesData = anomalies.some((entry) => DATA_DAMAGE.test(entry.event.message));
  const isAttack = anomalies.some(
    (entry) =>
      selectedById.get(entry.event.eventId)?.anomaly?.reasons.includes('attack signature') ===
        true || describesAdversary(entry),
  );
  let security: IncidentImpact['security'] = 'none';
  if (isAttack) {
    security = 'attempt';
  }
  return {
    affectedEntities: orders,
    paidThenFailed,
    failedEventCount: anomalies.length,
    affectedServices: distinct(anomalies.map((entry) => entry.event.service)),
    durationMs: durationOf(events),
    availabilityLoss: lossesAvailability(anomalies),
    integrityLoss: paidThenFailed.length > 0 || damagesData,
    security,
  };
}

function spreadPoints(impact: IncidentImpact, reasons: string[]): number {
  const entities = impact.affectedEntities.length;
  const services = impact.affectedServices.length;
  if (entities >= WIDE_ENTITY_COUNT || services >= WIDE_SERVICE_COUNT) {
    reasons.push(`wide spread: ${entities} entities, ${services} services`);
    return POINTS_WIDE;
  }
  if (entities >= SEVERAL_ENTITY_COUNT || services >= SEVERAL_ENTITY_COUNT) {
    reasons.push(`spread: ${entities} entities, ${services} services`);
    return POINTS_SEVERAL;
  }
  return 0;
}

function lowerSeverity(current: Severity, ceiling: Severity): Severity {
  if (SEVERITY_ORDER.indexOf(current) > SEVERITY_ORDER.indexOf(ceiling)) {
    return ceiling;
  }
  return current;
}

function severityFromPoints(points: number): Severity {
  if (points >= CRITICAL_FROM) {
    return 'critical';
  }
  if (points >= HIGH_FROM) {
    return 'high';
  }
  if (points >= MEDIUM_FROM) {
    return 'medium';
  }
  if (points >= 1) {
    return 'low';
  }
  return 'informational';
}

/**
 * A single HTTP 500 is medium, not critical. An attack attempt is not a compromise. Critical needs
 * a wide effect together with lost availability or integrity.
 */
export function assessSeverity(
  impact: IncidentImpact,
  anomalies: OrderedEvent[],
  selectedById: Map<string, SelectedEvent>,
): SeverityAssessment {
  const reasons: string[] = [];
  let points = 0;
  const strongest = anomalies.some(
    (entry) => selectedById.get(entry.event.eventId)?.anomaly?.strength === 'high',
  );
  if (strongest) {
    points += POINTS_HIGH_ANOMALY;
    reasons.push('an error-level failure');
  } else if (anomalies.length > 0) {
    points += POINTS_MEDIUM_ANOMALY;
    reasons.push('warnings only');
  }
  points += spreadPoints(impact, reasons);
  if (impact.integrityLoss) {
    points += POINTS_INTEGRITY;
    reasons.push('integrity: data left inconsistent');
  }
  if (impact.availabilityLoss) {
    points += POINTS_AVAILABILITY;
    reasons.push('availability: something became unavailable');
  }
  let severity = severityFromPoints(points);
  // Warnings and client errors alone, with no lost availability, no inconsistent data and no
  // attack, are a low-severity matter however many users they touch: the system coped.
  const onlyWarnings = !strongest && !impact.integrityLoss && !impact.availabilityLoss;
  if (onlyWarnings && impact.security === 'none') {
    severity = lowerSeverity(severity, 'low');
  }
  if (impact.security === 'attempt') {
    points += POINTS_SECURITY_ATTEMPT;
    reasons.push('security: an attack attempt, no compromise shown');
    // LogLens policy: an attack attempt is at least high; it is critical only with more than the attempt.
    severity = raiseSeverity(severityFromPoints(points), 'high');
  }
  return { severity, reasons };
}
