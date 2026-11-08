import { maskSecrets } from '../analysis/masking';
import type { StructuredAnalysis } from '../analysis/analyzeStructure';
import type { OrderedEvent } from '../analysis/eventOrdering';
import { identifiersOf } from '../parser/normalizedEvent';
import type { AiLimits } from './aiBudget';

/**
 * What the model is given to reason about: the correlated events of the log, not the raw text. It
 * is built from the incidents first (their failures and the events around them), then filled with
 * the other selected events until the size limits are reached. Secrets are hidden; the identifiers
 * that tie events together stay, because the model needs them to follow a story.
 *
 * The context carries what the deterministic engine found as CANDIDATES. The prompt tells the model
 * to verify them against the events, never to take them as an answer.
 */

const MAX_MESSAGE_CHARS = 300;
const MAX_ATTRIBUTES_PER_EVENT = 8;
const MAX_ATTRIBUTE_CHARS = 120;
const MAX_GROUPS = 100;

/** The attributes worth showing first: what an exception says and where it happened. */
const PRIORITY_ATTRIBUTES = ['exceptionClass', 'exceptionMessage', 'topFrame', 'rootCause'];

export interface StructuredContext {
  /** The JSON text that goes into the prompt. */
  json: string;
  includedEventIds: Set<string>;
  /** Selected events that did not fit within the limits. */
  omittedEvents: number;
  incidentIds: string[];
  maskedSecrets: number;
}

interface Counter {
  masked: number;
}

function masked(text: string, counter: Counter): string {
  const result = maskSecrets(text);
  counter.masked += result.masked;
  return result.text;
}

const UNRANKED_ATTRIBUTE = 99;

function attributeRank(key: string): number {
  const rank = PRIORITY_ATTRIBUTES.indexOf(key);
  if (rank === -1) {
    return UNRANKED_ATTRIBUTE;
  }
  return rank;
}

function attributesOf(
  attributes: Record<string, string | number | boolean | null>,
  counter: Counter,
): string[] {
  const keys = Object.keys(attributes).sort((a, b) => attributeRank(a) - attributeRank(b));
  return keys
    .slice(0, MAX_ATTRIBUTES_PER_EVENT)
    .map((key) =>
      masked(`${key}=${String(attributes[key])}`, counter).slice(0, MAX_ATTRIBUTE_CHARS),
    );
}

function eventPayload(entry: OrderedEvent, counter: Counter): Record<string, unknown> {
  const { event } = entry;
  const ids: Record<string, string> = {};
  for (const identifier of identifiersOf(event)) {
    ids[identifier.kind] = identifier.value;
  }
  const payload: Record<string, unknown> = {
    id: event.eventId,
    line: event.originalLineStart,
    t: event.timestamp,
    timeBasis: entry.timeBasis,
    level: event.level,
    service: event.service,
    message: masked(event.message, counter).slice(0, MAX_MESSAGE_CHARS),
  };
  if (event.statusCode !== null) {
    payload.status = event.statusCode;
  }
  if (Object.keys(ids).length > 0) {
    payload.ids = ids;
  }
  const attributes = attributesOf(event.attributes, counter);
  if (attributes.length > 0) {
    payload.attributes = attributes;
  }
  return payload;
}

/** The events to send, most important first: the incidents, then everything else in order. */
function priorityOrder(analysis: StructuredAnalysis): OrderedEvent[] {
  const inIncidents = new Set<string>();
  for (const incident of analysis.incidents) {
    incident.anomalyEventIds.forEach((id) => inIncidents.add(id));
    incident.contextEventIds.forEach((id) => inIncidents.add(id));
  }
  const first = analysis.correlation.ordered.filter((entry) =>
    inIncidents.has(entry.event.eventId),
  );
  const rest = analysis.correlation.ordered.filter(
    (entry) => !inIncidents.has(entry.event.eventId),
  );
  return [...first, ...rest];
}

export function buildStructuredContext(
  analysis: StructuredAnalysis,
  limits: AiLimits,
): StructuredContext {
  const counter: Counter = { masked: 0 };
  const included = new Set<string>();
  const payloads = new Map<string, Record<string, unknown>>();
  let usedChars = 0;
  for (const entry of priorityOrder(analysis)) {
    if (included.size >= limits.maxContextEvents) {
      break;
    }
    const payload = eventPayload(entry, counter);
    const textLength = JSON.stringify(payload).length;
    if (usedChars + textLength > limits.maxContextChars) {
      break;
    }
    usedChars += textLength;
    included.add(entry.event.eventId);
    payloads.set(entry.event.eventId, payload);
  }
  const events = analysis.correlation.ordered
    .filter((entry) => included.has(entry.event.eventId))
    .map((entry) => payloads.get(entry.event.eventId));
  const links = analysis.correlation.links
    .filter(
      (link) => link.causal && included.has(link.sourceEventId) && included.has(link.targetEventId),
    )
    .map((link) => ({
      id: link.id,
      from: link.sourceEventId,
      to: link.targetEventId,
      relation: link.relation,
      certainty: link.certainty,
      uncertainty: link.uncertainty,
    }));
  const groups = analysis.correlation.groups
    .map((group) => ({
      label: group.label,
      value: masked(group.value, counter),
      events: group.eventIds.filter((id) => included.has(id)),
    }))
    .filter((group) => group.events.length >= 2)
    .slice(0, MAX_GROUPS);
  const incidents = analysis.incidents.map((incident) => ({
    id: incident.id,
    severity: incident.severity.severity,
    category: incident.category,
    services: incident.services,
    failureEvents: incident.anomalyEventIds.filter((id) => included.has(id)),
    contextEvents: incident.contextEventIds.filter((id) => included.has(id)),
    candidateRootCause: {
      note: 'Found by the rules and the correlation engine. Verify it against the events: it is not an answer.',
      kind: incident.rootCause.kind,
      status: incident.rootCause.status,
      eventId: incident.rootCause.sourceEventId,
      summary: masked(incident.rootCause.summary, counter),
    },
  }));
  const { coverage } = analysis.selection;
  const context = {
    coverage: {
      totalLines: coverage.totalLines,
      selectedEvents: coverage.selectedEvents,
      sentEvents: included.size,
      complete: coverage.complete && included.size >= coverage.selectedEvents,
      limits: coverage.limits,
    },
    incidents,
    events,
    links,
    groups,
  };
  return {
    json: JSON.stringify(context),
    includedEventIds: included,
    omittedEvents: Math.max(0, analysis.correlation.ordered.length - included.size),
    incidentIds: analysis.incidents.map((incident) => incident.id),
    maskedSecrets: counter.masked,
  };
}
