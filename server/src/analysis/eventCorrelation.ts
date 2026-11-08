import { FALLBACK_RULE } from '../content/rules';
import { findRelation } from '../ai/correlation';
import { pickRule } from '../ai/ruleMatching';
import { cleanIdentifier, normaliseKey } from '../parser/fieldAliases';
import { identifiersOf, type NormalizedLogEvent } from '../parser/normalizedEvent';
import type { ContextSelection, SelectedEvent } from './contextSelection';
import type {
  CausalLink,
  Certainty,
  EventCorrelation,
  EventGroup,
  EvidenceRef,
  LinkRelation,
  RecurrenceGroup,
} from './correlationTypes';
import { orderEvents, type OrderedEvent } from './eventOrdering';
import { sharedTerms, termsOfEvent } from './terms';

/**
 * The correlation engine. It connects the events of a log into groups (events that carry the same
 * identifier) and into links (this may have caused that), and says how sure each link is and why.
 *
 * Three rules guide it:
 * 1. A shared identifier is evidence. Two events that carry the same request id belong together.
 * 2. Time is a hint, never a proof. Nothing is linked because it happened "around the same time",
 *    and a link whose order is not certain says so.
 * 3. A shared address or a shared category is not a link. Two failures from one IP, or two events
 *    of the same kind, are only related if something more ties them.
 */

const MAX_QUOTE_LENGTH = 300;
const MAX_LINKS_PER_CHANGE = 40;
const MAX_PAIR_WINDOW = 80;
const MIN_RECURRENCE = 3;
const MIN_ENTITY_ID_LENGTH = 3;

/** Fields that end in "id" but name a process, a thread or a person, not one thing that is followed. */
const NOT_ENTITY_KEYS = new Set([
  'pid',
  'tid',
  'threadid',
  'eventid',
  'userid',
  'uid',
  'sid',
  'hostid',
  'ppid',
]);

const CERTAINTY_RANK: Record<Certainty, number> = { confirmed: 2, probable: 1, possible: 0 };

interface Context {
  ordered: OrderedEvent[];
  byEventId: Map<string, OrderedEvent>;
  selectedById: Map<string, SelectedEvent>;
  terms: Map<string, Set<string>>;
}

function firstLineOf(event: NormalizedLogEvent): string {
  return event.raw.split('\n', 1)[0].slice(0, MAX_QUOTE_LENGTH);
}

export function evidenceOf(event: NormalizedLogEvent, note?: string): EvidenceRef {
  const ref: EvidenceRef = {
    eventId: event.eventId,
    lineStart: event.originalLineStart,
    lineEnd: event.originalLineEnd,
    quote: firstLineOf(event),
  };
  if (note !== undefined) {
    ref.note = note;
  }
  return ref;
}

/** An event that reports something wrong with more than a hint: the ones incidents are made of. */
export function isAnomaly(selected: SelectedEvent | undefined): boolean {
  return selected?.anomaly != null && selected.anomaly.strength !== 'low';
}

/** Notes on why the time order of a link might be wrong. */
function timeUncertainty(source: OrderedEvent, target: OrderedEvent): string[] {
  const notes: string[] = [];
  const uncertain = [source, target].some(
    (entry) => entry.timeBasis === 'inferred' || entry.timeBasis === 'file-order',
  );
  if (uncertain) {
    notes.push(
      'The time of one event is not in the log: its place in the order comes from the file.',
    );
  }
  if ([source, target].some((entry) => entry.timeBasis === 'assumed')) {
    notes.push('One event has no time zone: UTC (or the configured zone) was assumed.');
  }
  return notes;
}

/** The identifiers of an event that name one thing worth following, strong or not. */
function entityKeysOf(
  event: NormalizedLogEvent,
): { kind: EventGroup['kind']; label: string; value: string }[] {
  const keys: { kind: EventGroup['kind']; label: string; value: string }[] = identifiersOf(
    event,
  ).map((identifier) => ({
    kind: identifier.kind,
    label: identifier.kind,
    value: identifier.value,
  }));
  const known = new Set(keys.map((key) => key.label.toLowerCase()));
  for (const [key, value] of Object.entries(event.attributes)) {
    const normalised = normaliseKey(key);
    if (!normalised.endsWith('id') || normalised.length < 4 || NOT_ENTITY_KEYS.has(normalised)) {
      continue;
    }
    const id = cleanIdentifier(value);
    const looksLikeAnId =
      id !== null && id.length >= MIN_ENTITY_ID_LENGTH && /\d/.test(id) && !/^\d{1,4}$/.test(id);
    if (looksLikeAnId && !known.has(normalised)) {
      keys.push({ kind: 'entityId', label: key, value: id });
    }
  }
  return keys;
}

function buildGroups(ordered: OrderedEvent[]): EventGroup[] {
  const byKey = new Map<string, EventGroup>();
  for (const entry of ordered) {
    for (const key of entityKeysOf(entry.event)) {
      const mapKey = `${key.label}:${key.value}`;
      const group = byKey.get(mapKey) ?? {
        id: '',
        kind: key.kind,
        label: key.label,
        value: key.value,
        eventIds: [],
      };
      if (!group.eventIds.includes(entry.event.eventId)) {
        group.eventIds.push(entry.event.eventId);
      }
      byKey.set(mapKey, group);
    }
  }
  const groups = [...byKey.values()].filter((group) => group.eventIds.length >= 2);
  groups.forEach((group, index) => {
    group.id = `G${index + 1}`;
  });
  return groups;
}

/** The message with its numbers and ids replaced, so repeated events of one kind share a signature. */
export function signatureOf(event: NormalizedLogEvent): string {
  const template = event.message
    .toLowerCase()
    .replace(/[0-9a-f]{8,}/g, '#')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
  return `${event.service ?? '-'}|${template}`;
}

function buildRecurrences(
  ordered: OrderedEvent[],
  selectedById: Map<string, SelectedEvent>,
): RecurrenceGroup[] {
  const bySignature = new Map<string, OrderedEvent[]>();
  for (const entry of ordered) {
    if (!isAnomaly(selectedById.get(entry.event.eventId))) {
      continue;
    }
    const signature = signatureOf(entry.event);
    bySignature.set(signature, [...(bySignature.get(signature) ?? []), entry]);
  }
  const groups: RecurrenceGroup[] = [];
  const alreadyGrouped = new Set<string>();
  for (const [signature, entries] of bySignature) {
    if (entries.length >= MIN_RECURRENCE) {
      groups.push({
        id: `R${groups.length + 1}`,
        signature,
        service: entries[0].event.service,
        eventIds: entries.map((entry) => entry.event.eventId),
      });
      entries.forEach((entry) => alreadyGrouped.add(entry.event.eventId));
    }
  }
  groups.push(...ruleRecurrences(ordered, selectedById, alreadyGrouped, groups.length));
  return groups;
}

/**
 * The same KIND of failure repeated, even when the text differs (failed logins for different
 * users): events of one known rule in one service. Events already in a text recurrence are skipped.
 */
function ruleRecurrences(
  ordered: OrderedEvent[],
  selectedById: Map<string, SelectedEvent>,
  alreadyGrouped: Set<string>,
  groupsSoFar: number,
): RecurrenceGroup[] {
  const byRule = new Map<string, OrderedEvent[]>();
  for (const entry of ordered) {
    if (
      alreadyGrouped.has(entry.event.eventId) ||
      !isAnomaly(selectedById.get(entry.event.eventId))
    ) {
      continue;
    }
    const rule = pickRule(entry.event.raw.slice(0, 800));
    if (rule === FALLBACK_RULE) {
      continue;
    }
    const key = `rule:${rule.id}|${entry.event.service ?? '-'}`;
    byRule.set(key, [...(byRule.get(key) ?? []), entry]);
  }
  const groups: RecurrenceGroup[] = [];
  for (const [signature, entries] of byRule) {
    if (entries.length >= MIN_RECURRENCE) {
      groups.push({
        id: `R${groupsSoFar + groups.length + 1}`,
        signature,
        service: entries[0].event.service,
        eventIds: entries.map((entry) => entry.event.eventId),
      });
    }
  }
  return groups;
}

/** Collects links, keeping for each pair and kind only the most certain one. */
class LinkBook {
  private readonly links = new Map<string, CausalLink>();

  add(link: Omit<CausalLink, 'id'>): void {
    const key = `${link.sourceEventId}>${link.targetEventId}:${link.causal}`;
    const existing = this.links.get(key);
    if (
      existing === undefined ||
      CERTAINTY_RANK[link.certainty] > CERTAINTY_RANK[existing.certainty]
    ) {
      this.links.set(key, { ...link, id: '' });
    }
  }

  has(sourceId: string, targetId: string, causal: boolean): boolean {
    return this.links.has(`${sourceId}>${targetId}:${causal}`);
  }

  all(): CausalLink[] {
    return [...this.links.values()];
  }
}

function identityLinks(groups: EventGroup[], context: Context, book: LinkBook): void {
  for (const group of groups) {
    const members = group.eventIds
      .map((eventId) => context.byEventId.get(eventId))
      .filter((entry): entry is OrderedEvent => entry !== undefined)
      .sort((a, b) => a.position - b.position);
    for (let index = 1; index < members.length; index += 1) {
      const source = members[index - 1];
      const target = members[index];
      const note = `shares ${group.label}=${group.value}`;
      book.add({
        sourceEventId: source.event.eventId,
        targetEventId: target.event.eventId,
        relation: 'same-identifier',
        causal: false,
        evidence: [evidenceOf(source.event, note), evidenceOf(target.event, note)],
        certainty: 'confirmed',
        uncertainty: [],
      });
    }
  }
}

/** The value a change event sets: the right side of "a -> b", "from a to b", "now b". */
export function newValueOf(event: NormalizedLogEvent): string | null {
  const arrow = /(?:->|→|=>)\s*["']?([\w.:/-]+)/.exec(event.message);
  if (arrow) {
    return arrow[1];
  }
  const fromTo = /\bfrom\s+\S+\s+to\s+["']?([\w.:/-]+)/i.exec(event.message);
  if (fromTo) {
    return fromTo[1];
  }
  const now = /\bnow\s+["']?([\w.:/-]+)/i.exec(event.message);
  return now?.[1] ?? null;
}

function mentionsValue(event: NormalizedLogEvent, value: string): boolean {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w.])${escaped}(?![\\w.])`).test(
    `${event.message} ${JSON.stringify(event.attributes)}`,
  );
}

interface ChangeAssessment {
  certainty: Certainty;
  evidenceNote: string;
  uncertainty: string[];
}

function assessChange(
  change: OrderedEvent,
  effect: OrderedEvent,
  context: Context,
): ChangeAssessment | null {
  const shared = sharedTerms(
    context.terms.get(change.event.eventId) ?? new Set(),
    context.terms.get(effect.event.eventId) ?? new Set(),
  );
  if (shared.length === 0) {
    return null;
  }
  const newValue = newValueOf(change.event);
  const reportsValue = newValue !== null && mentionsValue(effect.event, newValue);
  const sameService =
    change.event.service !== null && change.event.service === effect.event.service;
  const uncertainty = timeUncertainty(change, effect);
  if (reportsValue) {
    return {
      certainty: 'confirmed',
      evidenceNote: `reports the new value ${newValue}`,
      uncertainty,
    };
  }
  uncertainty.push(
    'The log does not say that the change caused this event: the link rests on the subject they share.',
  );
  if (shared.length >= 2 || sameService) {
    return {
      certainty: 'probable',
      evidenceNote: 'shares its subject with the change',
      uncertainty,
    };
  }
  return { certainty: 'possible', evidenceNote: 'shares a word with the change', uncertainty };
}

function changeLinks(context: Context, book: LinkBook): void {
  for (const change of context.ordered) {
    if (context.selectedById.get(change.event.eventId)?.significant !== 'change') {
      continue;
    }
    const candidates: Omit<CausalLink, 'id'>[] = [];
    for (const effect of context.ordered.slice(change.position + 1)) {
      if (!isAnomaly(context.selectedById.get(effect.event.eventId))) {
        continue;
      }
      const assessment = assessChange(change, effect, context);
      if (assessment === null) {
        continue;
      }
      candidates.push({
        sourceEventId: change.event.eventId,
        targetEventId: effect.event.eventId,
        relation: 'change-precedes-anomaly',
        causal: true,
        evidence: [
          evidenceOf(change.event, 'the change'),
          evidenceOf(effect.event, assessment.evidenceNote),
        ],
        certainty: assessment.certainty,
        uncertainty: assessment.uncertainty,
      });
    }
    candidates
      .sort((a, b) => CERTAINTY_RANK[b.certainty] - CERTAINTY_RANK[a.certainty])
      .slice(0, MAX_LINKS_PER_CHANGE)
      .forEach((candidate) => book.add(candidate));
  }
}

function serviceNamesOf(ordered: OrderedEvent[]): Set<string> {
  const names = new Set<string>();
  for (const entry of ordered) {
    if (entry.event.service !== null && entry.event.service.length >= 3) {
      names.add(entry.event.service.toLowerCase());
    }
  }
  return names;
}

/** The services an event names in its text or fields, other than its own. */
function referencedServices(event: NormalizedLogEvent, names: Set<string>): string[] {
  const text = `${event.message} ${Object.values(event.attributes).join(' ')}`.toLowerCase();
  const own = event.service?.toLowerCase() ?? '';
  const found = new Set<string>();
  for (const word of text.split(/[^a-z0-9_-]+/)) {
    if (word !== own && names.has(word)) {
      found.add(word);
    }
  }
  return [...found];
}

function latestAnomalyOf(
  service: string,
  before: number,
  context: Context,
): OrderedEvent | undefined {
  for (let position = before - 1; position >= 0; position -= 1) {
    const entry = context.ordered[position];
    const isSameService = entry.event.service?.toLowerCase() === service;
    if (isSameService && isAnomaly(context.selectedById.get(entry.event.eventId))) {
      return entry;
    }
  }
  return undefined;
}

function dependencyLinks(context: Context, book: LinkBook, groups: EventGroup[]): void {
  const names = serviceNamesOf(context.ordered);
  const sharedGroup = (first: string, second: string): boolean =>
    groups.some((group) => group.eventIds.includes(first) && group.eventIds.includes(second));
  for (const effect of context.ordered) {
    if (!isAnomaly(context.selectedById.get(effect.event.eventId))) {
      continue;
    }
    for (const service of referencedServices(effect.event, names)) {
      const cause = latestAnomalyOf(service, effect.position, context);
      if (cause === undefined) {
        continue;
      }
      const sameStory = sharedGroup(cause.event.eventId, effect.event.eventId);
      const uncertainty = timeUncertainty(cause, effect);
      if (!sameStory) {
        uncertainty.push(`The log names ${service} but does not say its failure caused this one.`);
      }
      book.add({
        sourceEventId: cause.event.eventId,
        targetEventId: effect.event.eventId,
        relation: 'dependency-failure',
        causal: true,
        evidence: [
          evidenceOf(cause.event, `${service} failed`),
          evidenceOf(effect.event, `names ${service}`),
        ],
        certainty: dependencyCertainty(sameStory),
        uncertainty,
      });
    }
  }
}

function dependencyCertainty(sameStory: boolean): Certainty {
  if (sameStory) {
    return 'confirmed';
  }
  return 'probable';
}

/** Two anomalies of one entity, in order: the earlier may be why the later happened. */
function entitySequenceLinks(groups: EventGroup[], context: Context, book: LinkBook): void {
  for (const group of groups) {
    const anomalies = group.eventIds
      .map((eventId) => context.byEventId.get(eventId))
      .filter((entry): entry is OrderedEvent => entry !== undefined)
      .filter((entry) => isAnomaly(context.selectedById.get(entry.event.eventId)))
      .sort((a, b) => a.position - b.position);
    for (let index = 1; index < anomalies.length; index += 1) {
      const source = anomalies[index - 1];
      const target = anomalies[index];
      if (signatureOf(source.event) === signatureOf(target.event)) {
        continue;
      }
      const uncertainty = timeUncertainty(source, target);
      uncertainty.push(
        'Same identifier and the right order, but the log does not state the dependency.',
      );
      book.add({
        sourceEventId: source.event.eventId,
        targetEventId: target.event.eventId,
        relation: 'entity-sequence',
        causal: true,
        evidence: [
          evidenceOf(source.event, `${group.label}=${group.value}`),
          evidenceOf(target.event, `${group.label}=${group.value}`),
        ],
        certainty: 'probable',
        uncertainty,
      });
    }
  }
}

function findingOf(event: NormalizedLogEvent, category: string) {
  return {
    title: event.message,
    severity: 'medium' as const,
    category,
    evidence: firstLineOf(event),
  };
}

/** The knowledge base of known failure chains, applied to events that are close in the order. */
function knownRelationLinks(context: Context, book: LinkBook, groups: EventGroup[]): void {
  const anomalies = context.ordered.filter((entry) =>
    isAnomaly(context.selectedById.get(entry.event.eventId)),
  );
  const categories = new Map(
    anomalies.map((entry) => [entry.event.eventId, pickRuleCategory(entry.event)] as const),
  );
  anomalies.forEach((cause, causeIndex) => {
    const causeCategory = categories.get(cause.event.eventId);
    if (causeCategory === null || causeCategory === undefined) {
      return;
    }
    for (const effect of anomalies.slice(causeIndex + 1, causeIndex + 1 + MAX_PAIR_WINDOW)) {
      const effectCategory = categories.get(effect.event.eventId);
      if (effectCategory === null || effectCategory === undefined) {
        continue;
      }
      const relation = findRelation(
        findingOf(cause.event, causeCategory),
        findingOf(effect.event, effectCategory),
      );
      if (relation === undefined || book.has(cause.event.eventId, effect.event.eventId, true)) {
        continue;
      }
      const sameStory = groups.some(
        (group) =>
          group.eventIds.includes(cause.event.eventId) &&
          group.eventIds.includes(effect.event.eventId),
      );
      book.add({
        sourceEventId: cause.event.eventId,
        targetEventId: effect.event.eventId,
        relation: 'known-relation',
        causal: true,
        evidence: [
          evidenceOf(cause.event, causeCategory),
          evidenceOf(effect.event, effectCategory),
        ],
        certainty: knownRelationCertainty(sameStory),
        uncertainty: [
          ...timeUncertainty(cause, effect),
          `Known chain (${relation.id}); the log does not tie these two events together.`,
        ],
      });
    }
  });
}

function knownRelationCertainty(sameStory: boolean): Certainty {
  if (sameStory) {
    return 'probable';
  }
  return 'possible';
}

/** The rule category of an event, or null when no rule describes it. */
function pickRuleCategory(event: NormalizedLogEvent): string | null {
  const rule = pickRule(event.raw.slice(0, 800));
  if (rule === FALLBACK_RULE) {
    return null;
  }
  return rule.category;
}

function numberLinks(links: CausalLink[], context: Context): CausalLink[] {
  const sorted = links
    .filter((link) => {
      const source = context.byEventId.get(link.sourceEventId);
      const target = context.byEventId.get(link.targetEventId);
      // A link always points forward in time order: that is what keeps the graph free of cycles.
      return source !== undefined && target !== undefined && source.position < target.position;
    })
    .sort((a, b) => {
      const sourceA = context.byEventId.get(a.sourceEventId)?.position ?? 0;
      const sourceB = context.byEventId.get(b.sourceEventId)?.position ?? 0;
      const targetA = context.byEventId.get(a.targetEventId)?.position ?? 0;
      const targetB = context.byEventId.get(b.targetEventId)?.position ?? 0;
      return sourceA - sourceB || targetA - targetB;
    });
  return sorted.map((link, index) => ({ ...link, id: `L${index + 1}` }));
}

/** The relations that only say "these belong together" and never "this caused that". */
export const IDENTITY_RELATIONS: LinkRelation[] = ['same-identifier'];

/**
 * Correlates the selected events: orders them in time, groups them by identifier, and links them
 * with the evidence that supports each link and the reasons it might be wrong. Every link goes from
 * an earlier event to a later one, so the graph has no cycles by construction.
 */
export function buildEventCorrelation(selection: ContextSelection): EventCorrelation {
  const ordered = orderEvents(selection.selected);
  const context: Context = {
    ordered,
    byEventId: new Map(ordered.map((entry) => [entry.event.eventId, entry])),
    selectedById: new Map(selection.selected.map((entry) => [entry.event.eventId, entry])),
    terms: new Map(ordered.map((entry) => [entry.event.eventId, termsOfEvent(entry.event)])),
  };
  const groups = buildGroups(ordered);
  const book = new LinkBook();
  identityLinks(groups, context, book);
  changeLinks(context, book);
  dependencyLinks(context, book, groups);
  entitySequenceLinks(groups, context, book);
  knownRelationLinks(context, book, groups);
  return {
    ordered,
    groups,
    recurrences: buildRecurrences(ordered, context.selectedById),
    links: numberLinks(book.all(), context),
  };
}
