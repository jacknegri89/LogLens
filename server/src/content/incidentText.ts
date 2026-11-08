import type { RootCauseStatus } from '../types/report';

/**
 * The fixed words of the incident part of a report: how a root cause is worded for each status,
 * what is said about the impact, the actions that go with each kind of cause and the headings of
 * the Markdown section. English here, Italian in `incidentText.it.ts`. The sentences quote the
 * log (event messages, order ids); they never state more than the status allows.
 */

export type CauseKind = 'change' | 'dependency' | 'exception' | 'security' | 'unknown';

export interface CauseActions {
  immediate: string[];
  permanent: string[];
  preventive: string[];
}

export interface IncidentText {
  statusLabel: Record<RootCauseStatus, string>;
  /** "Confirmed cause: the change "..."": the status first, then what the cause is. */
  rootCause: (status: RootCauseStatus, kind: CauseKind, subject: string) => string;
  description: (failures: number, services: string[], entities: number) => string;
  reasoning: (kind: CauseKind, explained: number, total: number, confirmedLinks: number) => string;
  observedFailures: (count: number, services: string[]) => string;
  observedEntities: (count: number, list: string) => string;
  observedPaidThenFailed: (count: number, list: string) => string;
  observedUnavailable: string;
  observedAttempt: string;
  potentialCompromise: string;
  potentialContinues: string;
  potentialInconsistency: string;
  /** Criteria behind the confidence level, each one a measurable fact. */
  criterionExplained: (explained: number, total: number) => string;
  criterionConfirmedLinks: (count: number) => string;
  criterionNoContradiction: string;
  criterionContradiction: (count: number) => string;
  criterionTimeUncertain: string;
  criterionNoCause: string;
  /** Some failures are grouped only because they happened seconds apart in the same place. */
  criterionTimeGrouped: string;
  /** The same failure was already in the log before the supposed cause. */
  contradictionEarlier: (line: number) => string;
  /** Put in front of a command that destroys or overwrites something. */
  dangerousCaution: string;
  actions: Record<CauseKind, CauseActions>;
  /** Headings and labels of the Markdown section. */
  markdown: {
    incidents: string;
    rootCause: string;
    evidence: string;
    impact: string;
    observed: string;
    potential: string;
    timeline: string;
    immediate: string;
    permanent: string;
    preventive: string;
    severity: string;
    line: string;
    partial: (events: number, limit: string) => string;
    engine: (used: string, aiUsed: boolean, fallbackReason: string | null) => string;
  };
  /** The words of a coverage limit, by code. */
  limit: Record<string, string>;
}

const STATUS_LABEL_EN: Record<RootCauseStatus, string> = {
  confirmed: 'Confirmed',
  probable: 'Probable',
  unverified: 'Unverified hypothesis',
  insufficient: 'Insufficient information',
};

function subjectOf(kind: CauseKind, subject: string): string {
  switch (kind) {
    case 'change':
      return `the change "${subject}"`;
    case 'dependency':
      return `the failure of a dependency: "${subject}"`;
    case 'exception':
      return `an exception in the code: ${subject}`;
    case 'security':
      return `an attack attempt: "${subject}"`;
    default:
      return 'unknown';
  }
}

export const INCIDENT_TEXT: IncidentText = {
  statusLabel: STATUS_LABEL_EN,
  rootCause: (status, kind, subject) => {
    if (status === 'insufficient' || kind === 'unknown') {
      return 'The log shows the failure but not what caused it.';
    }
    return `${STATUS_LABEL_EN[status]} cause: ${subjectOf(kind, subject)}.`;
  },
  description: (failures, services, entities) => {
    let text = `${failures} failing events in ${services.join(', ') || 'the log'}`;
    if (entities > 0) {
      text += `, touching ${entities} orders or users`;
    }
    return `${text}.`;
  },
  reasoning: (kind, explained, total, confirmedLinks) => {
    let subject = 'candidate cause';
    if (kind === 'change') {
      subject = 'change';
    }
    return `The ${subject} precedes ${explained} of ${total} failures of the incident, and ${confirmedLinks} of the links to them are confirmed by the log itself.`;
  },
  observedFailures: (count, services) => `${count} failing events in ${services.join(', ')}.`,
  observedEntities: (count, list) => `${count} orders or users involved: ${list}.`,
  observedPaidThenFailed: (count, list) =>
    `${count} orders had their payment confirmed and then failed: ${list}.`,
  observedUnavailable: 'Something became unavailable: server errors or refused connections.',
  observedAttempt: 'An attack attempt was seen. The log does not show that it succeeded.',
  potentialCompromise: 'If the attempt had succeeded, the attacker would have reached the system.',
  potentialContinues: 'The failures continue until the cause is fixed.',
  potentialInconsistency: 'More records may be left inconsistent while the cause is not fixed.',
  criterionExplained: (explained, total) =>
    `The cause explains ${explained} of ${total} failures of the incident.`,
  criterionConfirmedLinks: (count) => `${count} links to the failures are confirmed by the log.`,
  criterionNoContradiction: 'No event in the log contradicts the cause.',
  criterionContradiction: (count) => `${count} events or facts speak against the cause.`,
  criterionTimeUncertain: 'The time of some events is not in the log: their order is inferred.',
  criterionNoCause: 'No link or exception ties the failures to a cause.',
  criterionTimeGrouped:
    'Some failures are grouped only because they happened within seconds of each other in the same place: the log does not tie them.',
  contradictionEarlier: (line) =>
    `The same kind of failure already appears at line ${line}, before this event.`,
  dangerousCaution:
    'Warning: this command is destructive or hard to undo. Check the target and take a backup first.',
  actions: {
    change: {
      immediate: [
        'Compare the changed value with the previous one and check whether the failures started right after the change.',
        'If the change is the cause, roll it back or restore the previous value, then watch whether the failures stop.',
      ],
      permanent: [
        'Fix the value or the code that depends on it, and ship the fix through the normal release.',
      ],
      preventive: [
        'Validate configuration values (ranges, units) before they are applied.',
        'Roll out configuration changes gradually and alert on the failures that follow a change.',
      ],
    },
    dependency: {
      immediate: [
        'Check the health of the failing dependency and restore it first: the later errors depend on it.',
        'Check again the errors that came after it once it works.',
      ],
      permanent: [
        'Add a retry with a growing delay and a clear timeout where the failing call is made.',
      ],
      preventive: [
        'Monitor the dependency and alert before its failure reaches the services that call it.',
      ],
    },
    exception: {
      immediate: [
        'Open the file and line of the first stack frame and find which value or state caused the exception.',
      ],
      permanent: ['Fix the code at that place and add a test that reproduces the failing input.'],
      preventive: [
        'Report unhandled exceptions with their request context so the next one is found faster.',
      ],
    },
    security: {
      immediate: [
        'Block or rate-limit the source of the requests, and check the access logs for the same source on other paths.',
        'Check that the targeted application rejected the payload; do not assume a compromise without a sign of it.',
      ],
      permanent: ['Validate and encode the inputs that the payload targeted.'],
      preventive: [
        'Put a WAF or a rate limit in front of public endpoints and alert on scanner signatures.',
      ],
    },
    unknown: {
      immediate: [
        'Collect more of the log around the failures: the events before the first one and the logs of the other services involved.',
      ],
      permanent: [],
      preventive: [
        'Log identifiers (request id, order id) in every service so failures can be followed across them.',
      ],
    },
  },
  markdown: {
    incidents: '## Incidents',
    rootCause: 'Root cause',
    evidence: 'Evidence',
    impact: 'Impact',
    observed: 'Observed',
    potential: 'Potential, not observed',
    timeline: 'Timeline',
    immediate: 'Immediate actions',
    permanent: 'Permanent fix',
    preventive: 'Preventive measures',
    severity: 'Severity',
    line: 'line',
    partial: (events, limit) =>
      `> **Partial analysis.** ${events} events could not be analysed (${limit}). The conclusions below cover only what was analysed.`,
    engine: (used, aiUsed, fallbackReason) => {
      if (fallbackReason !== null) {
        return `> Engine: ${used} (no AI was used: ${fallbackReason}).`;
      }
      if (aiUsed) {
        return `> Engine: ${used} (AI-assisted, checked against the log).`;
      }
      return `> Engine: ${used} (no AI was used).`;
    },
  },
  limit: {
    'records-not-acquired': 'records that could not be read',
    'cut-by-budget': 'events cut by the size limit',
    'identifier-cap': 'events cut from a very frequent identifier',
    'change-cap': 'changes beyond the limit',
  },
};
