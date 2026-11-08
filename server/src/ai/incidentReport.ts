import type { StructuredAnalysis } from '../analysis/analyzeStructure';
import { maskSecrets } from '../analysis/masking';
import type { CausalLink, EvidenceRef } from '../analysis/correlationTypes';
import type { OrderedEvent } from '../analysis/eventOrdering';
import type { Hypothesis, Incident } from '../analysis/incidentTypes';
import { incidentText } from '../content/localized';
import type { CauseKind, IncidentText } from '../content/incidentText';
import type { Language } from '../types/language';
import type {
  IncidentConfidence,
  IncidentImpactReport,
  IncidentReport,
  IncidentRootCause,
  IncidentTimelineEntry,
  ReportEvidence,
  RootCauseStatus,
  ValidationIssue,
  ValidationInfo,
} from '../types/report';
import {
  capCertainty,
  checkCommandStep,
  evidenceFromEvent,
  sanitizeClaims,
  validateIncidentReports,
  type ValidationContext,
} from './evidenceValidator';
import type { IncidentAssessment } from './schema';

/**
 * Turns the incidents the engine found into the incidents of the report: root cause with its
 * status and evidence, timeline, impact, confidence with measurable criteria, and the actions.
 * Everything is built from engine facts. A model's assessment of an incident is merged in only
 * after the Evidence Validator has checked it against the log, and it can lower the certainty of
 * the engine's conclusion freely but raise it only as far as the evidence allows.
 */

const MAX_TIMELINE_ENTRIES = 500;
const MAX_SECONDARY_SYMPTOMS = 50;
const MAX_EVIDENCE = 12;
const MAX_TITLE = 160;
const MAX_LISTED_ENTITIES = 8;

const HIGH_COVERAGE = 0.8;

interface BuildInput {
  analysis: StructuredAnalysis;
  language: Language;
  context: ValidationContext;
  assessments?: IncidentAssessment[];
}

interface LinkFacts {
  confirmedFromCause: number;
  /** The strongest incoming causal link of each event of the incident. */
  causedBy: Map<string, string>;
}

/** Log text as a report may show it: secrets hidden, because reports are stored and can be shared. */
function hidden(text: string): string {
  return maskSecrets(text).text;
}

function toEvidence(reference: EvidenceRef): ReportEvidence {
  const evidence: ReportEvidence = {
    eventId: reference.eventId,
    lineStart: reference.lineStart,
    lineEnd: reference.lineEnd,
    quote: hidden(reference.quote),
  };
  if (reference.note !== undefined) {
    evidence.note = reference.note;
  }
  return evidence;
}

function linkFactsOf(incident: Incident, links: CausalLink[]): LinkFacts {
  const inIncident = new Set(incident.linkIds);
  const causedBy = new Map<string, CausalLink>();
  let confirmedFromCause = 0;
  for (const link of links) {
    if (!inIncident.has(link.id) || !link.causal || link.certainty === 'possible') {
      continue;
    }
    const current = causedBy.get(link.targetEventId);
    if (
      current === undefined ||
      (link.certainty === 'confirmed' && current.certainty !== 'confirmed')
    ) {
      causedBy.set(link.targetEventId, link);
    }
    if (link.sourceEventId === incident.rootCause.sourceEventId && link.certainty === 'confirmed') {
      confirmedFromCause += 1;
    }
  }
  const sources = new Map<string, string>();
  causedBy.forEach((link, target) => sources.set(target, link.sourceEventId));
  return { confirmedFromCause, causedBy: sources };
}

function causeKindOf(hypothesis: Hypothesis): CauseKind {
  return hypothesis.kind;
}

function timelineOf(
  incident: Incident,
  ordered: OrderedEvent[],
  facts: LinkFacts,
): IncidentTimelineEntry[] {
  const wanted = new Set([...incident.anomalyEventIds, ...incident.contextEventIds]);
  const anomalies = new Set(incident.anomalyEventIds);
  return ordered
    .filter((entry) => wanted.has(entry.event.eventId))
    .slice(0, MAX_TIMELINE_ENTRIES)
    .map((entry): IncidentTimelineEntry => {
      const { event } = entry;
      let role: IncidentTimelineEntry['role'] = 'context';
      if (event.eventId === incident.rootCause.sourceEventId) {
        role = 'cause';
      } else if (anomalies.has(event.eventId)) {
        role = 'symptom';
      }
      const item: IncidentTimelineEntry = {
        eventId: event.eventId,
        lineStart: event.originalLineStart,
        title: hidden(event.message.slice(0, MAX_TITLE)),
        role,
      };
      if (event.timestamp !== null) {
        item.time = event.timestamp;
      }
      if (event.service !== null) {
        item.service = event.service;
      }
      const cause = facts.causedBy.get(event.eventId);
      if (cause !== undefined) {
        item.causedBy = cause;
      }
      return item;
    });
}

function impactOf(incident: Incident, text: IncidentText): IncidentImpactReport {
  const { impact } = incident;
  const observed: string[] = [];
  const potential: string[] = [];
  observed.push(text.observedFailures(impact.failedEventCount, impact.affectedServices));
  if (impact.affectedEntities.length > 0) {
    const list = impact.affectedEntities.slice(0, MAX_LISTED_ENTITIES).join(', ');
    observed.push(text.observedEntities(impact.affectedEntities.length, list));
  }
  if (impact.paidThenFailed.length > 0) {
    const list = impact.paidThenFailed.slice(0, MAX_LISTED_ENTITIES).join(', ');
    observed.push(text.observedPaidThenFailed(impact.paidThenFailed.length, list));
    potential.push(text.potentialInconsistency);
  }
  if (impact.availabilityLoss) {
    observed.push(text.observedUnavailable);
  }
  if (impact.security === 'attempt') {
    observed.push(text.observedAttempt);
    potential.push(text.potentialCompromise);
  }
  if (incident.rootCause.status === 'confirmed' || incident.rootCause.status === 'probable') {
    potential.push(text.potentialContinues);
  }
  return {
    observed,
    potential,
    affectedEntities: impact.affectedEntities,
    affectedServices: impact.affectedServices,
  };
}

function confidenceOf(
  incident: Incident,
  facts: LinkFacts,
  ordered: OrderedEvent[],
  text: IncidentText,
): IncidentConfidence {
  const { rootCause } = incident;
  const criteria: string[] = [];
  const total = incident.anomalyEventIds.length;
  const explained = rootCause.explainedEventIds.length;
  if (incident.groupedByTime) {
    criteria.push(text.criterionTimeGrouped);
  }
  if (rootCause.kind === 'unknown') {
    criteria.push(text.criterionNoCause);
    return { level: 'low', criteria };
  }
  criteria.push(text.criterionExplained(explained, total));
  criteria.push(text.criterionConfirmedLinks(facts.confirmedFromCause));
  if (rootCause.contradicting.length === 0) {
    criteria.push(text.criterionNoContradiction);
  } else {
    criteria.push(text.criterionContradiction(rootCause.contradicting.length));
  }
  const involved = new Set([...incident.anomalyEventIds, ...incident.contextEventIds]);
  const timeUncertain = ordered.some(
    (entry) =>
      involved.has(entry.event.eventId) &&
      (entry.timeBasis === 'inferred' || entry.timeBasis === 'file-order'),
  );
  if (timeUncertain) {
    criteria.push(text.criterionTimeUncertain);
  }
  const coverage = explained / Math.max(1, total);
  if (
    rootCause.status === 'confirmed' &&
    coverage >= HIGH_COVERAGE &&
    facts.confirmedFromCause > 0 &&
    !timeUncertain
  ) {
    return { level: 'high', criteria };
  }
  if (rootCause.status === 'confirmed' || rootCause.status === 'probable') {
    return { level: 'medium', criteria };
  }
  return { level: 'low', criteria };
}

function rootCauseOf(
  incident: Incident,
  context: ValidationContext,
  text: IncidentText,
  facts: LinkFacts,
): IncidentRootCause {
  const { rootCause } = incident;
  const kind = causeKindOf(rootCause);
  const result: IncidentRootCause = {
    status: rootCause.status,
    kind,
    summary: hidden(text.rootCause(rootCause.status, kind, rootCause.summary)),
    evidence: rootCause.supporting.map(toEvidence),
    contradicting: rootCause.contradicting.map((item) => text.contradictionEarlier(item.line)),
    alternatives: incident.alternatives.map((alternative) => ({
      summary: hidden(alternative.summary),
      status: alternative.status,
      kind: alternative.kind,
    })),
  };
  if (rootCause.sourceEventId !== null) {
    result.eventId = rootCause.sourceEventId;
  }
  if (kind === 'change' || kind === 'dependency') {
    result.reasoning = text.reasoning(
      kind,
      rootCause.explainedEventIds.length,
      incident.anomalyEventIds.length,
      facts.confirmedFromCause,
    );
  }
  // The evidence of a hypothesis always comes from real events; a missing one is a bug to surface.
  result.evidence = result.evidence.filter((reference) =>
    context.eventsById.has(reference.eventId),
  );
  return result;
}

function secondarySymptomsOf(incident: Incident, context: ValidationContext): ReportEvidence[] {
  const symptoms: ReportEvidence[] = [];
  for (const eventId of incident.symptomEventIds.slice(0, MAX_SECONDARY_SYMPTOMS)) {
    const event = context.eventsById.get(eventId);
    if (event !== undefined) {
      symptoms.push(evidenceFromEvent(event));
    }
  }
  return symptoms;
}

interface MergeOutcome {
  rootCause: IncidentRootCause;
  actions: { immediate: string[]; permanent: string[]; preventive: string[] } | null;
  issues: ValidationIssue[];
}

function cleanSteps(
  steps: string[],
  context: ValidationContext,
  text: IncidentText,
  incidentId: string,
) {
  const issues: ValidationIssue[] = [];
  const kept: string[] = [];
  for (const raw of steps) {
    const claims = sanitizeClaims(raw, context);
    if (claims.unsupported.length > 0) {
      issues.push({
        code: 'unknown-value',
        incidentId,
        detail: `A step named values that are not in the log: ${claims.unsupported.join(', ')}.`,
      });
    }
    if (claims.text === '') {
      continue;
    }
    const checked = checkCommandStep(claims.text, text.dangerousCaution);
    if (checked.issue !== null) {
      issues.push({ ...checked.issue, incidentId });
    }
    if (checked.step !== null) {
      kept.push(checked.step);
    }
  }
  return { kept, issues };
}

/** Merges what a model said about an incident, after checking every claim against the log. */
function mergeAssessment(
  base: IncidentRootCause,
  assessment: IncidentAssessment,
  engineStatus: RootCauseStatus,
  context: ValidationContext,
  text: IncidentText,
  incidentId: string,
): MergeOutcome {
  const issues: ValidationIssue[] = [];
  const cited: ReportEvidence[] = [];
  for (const eventId of assessment.evidenceEventIds) {
    const event = context.eventsById.get(eventId);
    if (event === undefined) {
      issues.push({
        code: 'unknown-event',
        incidentId,
        detail: `The model cited ${eventId}, which is not in the log.`,
      });
      continue;
    }
    cited.push(evidenceFromEvent(event, 'cited by the analysis'));
  }
  const certainty = capCertainty(assessment.rootCauseStatus, engineStatus, cited.length);
  if (certainty.downgraded) {
    issues.push({
      code: 'certainty-downgraded',
      incidentId,
      detail: `The model claimed "${assessment.rootCauseStatus}"; the evidence supports "${certainty.status}".`,
    });
  }
  const summary = sanitizeClaims(assessment.rootCauseSummary, context);
  if (summary.unsupported.length > 0) {
    issues.push({
      code: 'unknown-value',
      incidentId,
      detail: `The root cause named values that are not in the log: ${summary.unsupported.join(', ')}.`,
    });
  }
  let reasoning = base.reasoning;
  if (assessment.reasoning !== undefined) {
    const checkedReasoning = sanitizeClaims(assessment.reasoning, context);
    if (checkedReasoning.unsupported.length > 0) {
      issues.push({
        code: 'unknown-value',
        incidentId,
        detail: `The reasoning named values that are not in the log: ${checkedReasoning.unsupported.join(', ')}.`,
      });
    }
    if (checkedReasoning.text !== '') {
      reasoning = checkedReasoning.text;
    }
  }
  const seen = new Set(base.evidence.map((reference) => reference.eventId));
  const evidence = [...base.evidence, ...cited.filter((reference) => !seen.has(reference.eventId))];
  const rootCause: IncidentRootCause = {
    ...base,
    status: certainty.status,
    evidence: evidence.slice(0, MAX_EVIDENCE),
  };
  if (summary.text !== '') {
    rootCause.summary = summary.text;
  }
  if (reasoning !== undefined) {
    rootCause.reasoning = reasoning;
  }
  const notes = assessment.contradictingNotes.map((note) => sanitizeClaims(note, context).text);
  rootCause.contradicting = [...base.contradicting, ...notes.filter((note) => note !== '')];
  const immediate = cleanSteps(assessment.immediateActions, context, text, incidentId);
  const permanent = cleanSteps(assessment.permanentFix, context, text, incidentId);
  const preventive = cleanSteps(assessment.preventiveMeasures, context, text, incidentId);
  issues.push(...immediate.issues, ...permanent.issues, ...preventive.issues);
  const hasActions = immediate.kept.length + permanent.kept.length + preventive.kept.length > 0;
  let actions: MergeOutcome['actions'] = null;
  if (hasActions) {
    actions = { immediate: immediate.kept, permanent: permanent.kept, preventive: preventive.kept };
  }
  return { rootCause, actions, issues };
}

export interface IncidentReports {
  incidents: IncidentReport[];
  validation: ValidationInfo;
}

export function buildIncidentReports(input: BuildInput): IncidentReports {
  const { analysis, language, context } = input;
  const text = incidentText(language);
  const issues: ValidationIssue[] = [];
  const reports = analysis.incidents.map((incident): IncidentReport => {
    const facts = linkFactsOf(incident, analysis.correlation.links);
    let rootCause = rootCauseOf(incident, context, text, facts);
    let actions = text.actions[causeKindOf(incident.rootCause)];
    const assessment = input.assessments?.find((item) => item.incidentId === incident.id);
    if (assessment !== undefined) {
      const merged = mergeAssessment(
        rootCause,
        assessment,
        incident.rootCause.status,
        context,
        text,
        incident.id,
      );
      rootCause = merged.rootCause;
      issues.push(...merged.issues);
      if (merged.actions !== null) {
        actions = merged.actions;
      }
    }
    const confidence = confidenceOf(incident, facts, analysis.correlation.ordered, text);
    if (rootCause.status !== incident.rootCause.status) {
      confidence.level = 'low';
    }
    return {
      id: incident.id,
      title: hidden(incident.title),
      category: incident.category,
      severity: incident.severity.severity,
      severityReasons: incident.severity.reasons,
      description: text.description(
        incident.anomalyEventIds.length,
        incident.services,
        incident.impact.affectedEntities.length,
      ),
      rootCause,
      confidence,
      timeline: timelineOf(incident, analysis.correlation.ordered, facts),
      secondarySymptoms: secondarySymptomsOf(incident, context),
      impact: impactOf(incident, text),
      immediateActions: actions.immediate,
      permanentFix: actions.permanent,
      preventiveMeasures: actions.preventive,
    };
  });
  const { incidents, validation } = validateIncidentReports(reports, context, issues);
  return { incidents, validation };
}
