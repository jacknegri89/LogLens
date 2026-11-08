import { maskSecrets } from '../analysis/masking';
import type { StructuredAnalysis } from '../analysis/analyzeStructure';
import type { OrderedEvent } from '../analysis/eventOrdering';
import {
  identifiersOf,
  type NormalizedLogEvent,
  type StrongIdentifierKind,
} from '../parser/normalizedEvent';
import type { AiLimits } from './aiBudget';

/**
 * What the model is given to reason about: the correlated events of the log, not the raw text. It
 * is built from the incidents first (their failures, the supposed causes and the events around
 * them), then filled with the other selected events until the size limits are reached.
 *
 * Privacy: every piece of text that comes from the log is masked here, whichever field it sits in
 * (message, attributes, service names, identifiers, group values, link notes). Identifiers that
 * tie events together stay readable, except those that are credentials by nature (a session id is
 * a login in disguise): those are replaced by a stable pseudonym, `session-1`, `session-2`, so the
 * model still sees which events share a session without ever seeing the session itself.
 *
 * Size: the limit applies to the whole JSON document, not only to the events. The largest number
 * of events that keeps the document within the limit is sent, most important first, and the
 * document says how many failures it had to leave out.
 *
 * The context carries what the deterministic engine found as CANDIDATES. The prompt tells the model
 * to verify them against the events, never to take them as an answer.
 */

const MAX_MESSAGE_CHARS = 300;
const MAX_ATTRIBUTES_PER_EVENT = 8;
const MAX_ATTRIBUTE_CHARS = 120;
const MAX_TEXT_CHARS = 200;
const MAX_GROUPS = 100;

/** The attributes worth showing first: what an exception says and where it happened. */
const PRIORITY_ATTRIBUTES = ['exceptionClass', 'exceptionMessage', 'topFrame', 'rootCause'];

/** Identifier kinds whose value is a credential or acts like one: never sent, only a pseudonym. */
const PSEUDONYMISED_KINDS: StrongIdentifierKind[] = ['sessionId'];

export interface StructuredContext {
  /** The JSON text that goes into the prompt. */
  json: string;
  includedEventIds: Set<string>;
  /** Selected events that did not fit within the limits. */
  omittedEvents: number;
  incidentIds: string[];
  maskedSecrets: number;
}

/** Values shorter than this are not replaced inside text: "1" would match everywhere. */
const MIN_PSEUDONYMISED_LENGTH = 4;

/** Hides secrets in a text from the log and counts how many it hid. */
class Redactor {
  masked = 0;
  private readonly pseudonyms = new Map<string, string>();
  /** The (value, pseudonym) pairs that every text written now must have replaced. */
  private scope: [string, string][] = [];

  text(value: string, maxChars: number = MAX_TEXT_CHARS): string {
    const result = maskSecrets(value);
    this.masked += result.masked;
    let hidden = result.text;
    for (const [secretValue, pseudonym] of this.scope) {
      hidden = hidden.replaceAll(secretValue, pseudonym);
    }
    return hidden.slice(0, maxChars);
  }

  /** The same value always gets the same pseudonym, so relations between events survive. */
  identifier(kind: StrongIdentifierKind, value: string): string {
    if (!PSEUDONYMISED_KINDS.includes(kind)) {
      return this.text(value);
    }
    const key = `${kind}:${value}`;
    let pseudonym = this.pseudonyms.get(key);
    if (pseudonym === undefined) {
      const label = kind.replace(/Id$/, '');
      pseudonym = `${label}-${this.pseudonyms.size + 1}`;
      this.pseudonyms.set(key, pseudonym);
    }
    return pseudonym;
  }

  /** From now on, texts hide these identifier values too: the event's own credentials-by-nature. */
  hideIdentifiersOf(event: NormalizedLogEvent): void {
    this.scope = [];
    for (const identifier of identifiersOf(event)) {
      if (PSEUDONYMISED_KINDS.includes(identifier.kind)) {
        this.addToScope(identifier.kind, identifier.value);
      }
    }
  }

  /** From now on, texts hide every pseudonymised value met so far (incident summaries). */
  hideAllKnownIdentifiers(): void {
    this.scope = [];
    for (const [key, pseudonym] of this.pseudonyms) {
      this.scope.push([key.slice(key.indexOf(':') + 1), pseudonym]);
    }
  }

  private addToScope(kind: StrongIdentifierKind, value: string): void {
    if (value.length < MIN_PSEUDONYMISED_LENGTH) {
      return;
    }
    this.scope.push([value, this.identifier(kind, value)]);
  }

  /** A group value is an identifier too: it must use the same pseudonym its events got. */
  groupValue(groupKind: string, value: string): string {
    const kind = PSEUDONYMISED_KINDS.find((candidate) => candidate === groupKind);
    if (kind === undefined) {
      return this.text(value);
    }
    return this.identifier(kind, value);
  }
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
  redactor: Redactor,
): string[] {
  const keys = Object.keys(attributes).sort((a, b) => attributeRank(a) - attributeRank(b));
  return keys
    .slice(0, MAX_ATTRIBUTES_PER_EVENT)
    .map((key) => redactor.text(`${key}=${String(attributes[key])}`, MAX_ATTRIBUTE_CHARS));
}

function eventPayload(entry: OrderedEvent, redactor: Redactor): Record<string, unknown> {
  const { event } = entry;
  // The message and the attributes repeat the identifiers: they must not give them away.
  redactor.hideIdentifiersOf(event);
  const ids: Record<string, string> = {};
  for (const identifier of identifiersOf(event)) {
    ids[identifier.kind] = redactor.identifier(identifier.kind, identifier.value);
  }
  const payload: Record<string, unknown> = {
    id: event.eventId,
    line: event.originalLineStart,
    t: event.timestamp,
    timeBasis: entry.timeBasis,
    level: event.level,
    message: redactor.text(event.message, MAX_MESSAGE_CHARS),
  };
  if (event.service !== null) {
    payload.service = redactor.text(event.service);
  }
  if (event.statusCode !== null) {
    payload.status = event.statusCode;
  }
  if (Object.keys(ids).length > 0) {
    payload.ids = ids;
  }
  const attributes = attributesOf(event.attributes, redactor);
  if (attributes.length > 0) {
    payload.attributes = attributes;
  }
  return payload;
}

/**
 * The events in the order they are kept when the document is too large: the failures of the
 * incidents and the supposed causes first, then the events around the incidents, then everything
 * else. Inside each group the order of the log is kept.
 */
function priorityOrder(analysis: StructuredAnalysis): OrderedEvent[] {
  const mostImportant = new Set<string>();
  const nearIncidents = new Set<string>();
  for (const incident of analysis.incidents) {
    incident.anomalyEventIds.forEach((id) => mostImportant.add(id));
    if (incident.rootCause.sourceEventId !== null) {
      mostImportant.add(incident.rootCause.sourceEventId);
    }
    incident.contextEventIds.forEach((id) => nearIncidents.add(id));
  }
  const ordered = analysis.correlation.ordered;
  const first = ordered.filter((entry) => mostImportant.has(entry.event.eventId));
  const second = ordered.filter(
    (entry) => !mostImportant.has(entry.event.eventId) && nearIncidents.has(entry.event.eventId),
  );
  const rest = ordered.filter(
    (entry) => !mostImportant.has(entry.event.eventId) && !nearIncidents.has(entry.event.eventId),
  );
  return [...first, ...second, ...rest];
}

interface Assembled {
  json: string;
  included: Set<string>;
  masked: number;
}

/** The whole document for the first `count` events of the priority order. */
function assemble(
  analysis: StructuredAnalysis,
  priority: OrderedEvent[],
  count: number,
): Assembled {
  const redactor = new Redactor();
  const included = new Set(priority.slice(0, count).map((entry) => entry.event.eventId));
  const events = analysis.correlation.ordered
    .filter((entry) => included.has(entry.event.eventId))
    .map((entry) => eventPayload(entry, redactor));
  redactor.hideAllKnownIdentifiers();
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
      uncertainty: link.uncertainty.map((reason) => redactor.text(reason)),
    }));
  const groups = analysis.correlation.groups
    .map((group) => ({
      label: redactor.text(group.label),
      value: redactor.groupValue(group.kind, group.value),
      events: group.eventIds.filter((id) => included.has(id)),
    }))
    .filter((group) => group.events.length >= 2)
    .slice(0, MAX_GROUPS);
  redactor.hideAllKnownIdentifiers();
  const incidents = analysis.incidents.map((incident) => {
    const failureEvents = incident.anomalyEventIds.filter((id) => included.has(id));
    return {
      id: incident.id,
      severity: incident.severity.severity,
      category: redactor.text(incident.category),
      services: incident.services.map((service) => redactor.text(service)),
      failureEvents,
      omittedFailureEvents: incident.anomalyEventIds.length - failureEvents.length,
      contextEvents: incident.contextEventIds.filter((id) => included.has(id)),
      candidateRootCause: {
        note: 'Found by the rules and the correlation engine. Verify it against the events: it is not an answer.',
        kind: incident.rootCause.kind,
        status: incident.rootCause.status,
        eventId: incident.rootCause.sourceEventId,
        summary: redactor.text(incident.rootCause.summary),
      },
    };
  });
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
  return { json: JSON.stringify(context), included, masked: redactor.masked };
}

/**
 * The largest number of events whose document fits the character limit. The document only grows
 * when an event is added, so a binary search finds it with a handful of builds.
 */
function largestFittingCount(
  analysis: StructuredAnalysis,
  priority: OrderedEvent[],
  limits: AiLimits,
): number {
  let low = 0;
  let high = Math.min(priority.length, limits.maxContextEvents);
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (assemble(analysis, priority, middle).json.length <= limits.maxContextChars) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

export function buildStructuredContext(
  analysis: StructuredAnalysis,
  limits: AiLimits,
): StructuredContext {
  const priority = priorityOrder(analysis);
  const count = largestFittingCount(analysis, priority, limits);
  const built = assemble(analysis, priority, count);
  return {
    json: built.json,
    includedEventIds: built.included,
    omittedEvents: Math.max(0, analysis.correlation.ordered.length - built.included.size),
    incidentIds: analysis.incidents.map((incident) => incident.id),
    maskedSecrets: built.masked,
  };
}
