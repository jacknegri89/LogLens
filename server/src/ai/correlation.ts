import {
  CAUSAL_RELATIONS,
  MAX_OVERVIEW_ITEMS,
  MAX_OVERVIEW_LENGTH,
  OVERVIEW_TEXT,
  type CausalRelation,
  type EventMatcher,
} from '../content/correlations';
import type { Finding } from '../types/report';
import {
  buildTimeline,
  describeEvents,
  hasTimes,
  shortenText,
  splitLines,
  type TimelineEvent,
} from './eventTimeline';
import { findLoginEscalation, type LoginEscalation } from './loginEscalation';
import { describeSharedEntities } from './sharedEntities';

/** What the correlation layer found out about one excerpt. */
export interface Correlation {
  /** Short sentences that explain how the events connect. Empty when nothing connects. */
  overview: string[];
  /** The earliest finding that the relation table links to a later one, or null. */
  rootCause: Finding | null;
  /** True when failed logins from an address are followed by an accepted login from it. */
  compromisedLogin: boolean;
}

interface Link {
  cause: TimelineEvent;
  effect: TimelineEvent;
  relation: CausalRelation;
}

/** A root cause, the relation that links it to its first effect, and everything that follows from it. */
interface Chain {
  root: TimelineEvent;
  relation: CausalRelation;
  consequences: TimelineEvent[];
}

const MAX_TITLE_IN_SENTENCE = 45;
const MAX_CONSEQUENCES_NAMED = 2;

function matchesAny(matchers: EventMatcher[], finding: Finding): boolean {
  return matchers.some(
    (matcher) =>
      matcher.categories.includes(finding.category) &&
      (matcher.evidence === undefined || matcher.evidence.test(finding.evidence)),
  );
}

function findRelation(cause: Finding, effect: Finding): CausalRelation | undefined {
  return CAUSAL_RELATIONS.find(
    (relation) => matchesAny(relation.causes, cause) && matchesAny(relation.effects, effect),
  );
}

/** Pairs where the cause comes strictly BEFORE the effect: an earlier symptom is never blamed on a later event. */
function findLinks(timeline: TimelineEvent[]): Link[] {
  return timeline.flatMap((cause, causeIndex) =>
    timeline.slice(causeIndex + 1).flatMap((effect) => {
      const relation = findRelation(cause.finding, effect.finding);
      return relation ? [{ cause, effect, relation }] : [];
    }),
  );
}

/** Everything that follows from the root, directly or through other effects, in time order. */
function followEffects(
  root: TimelineEvent,
  links: Link[],
  timeline: TimelineEvent[],
): TimelineEvent[] {
  const reached = new Set<TimelineEvent>();
  const queue = [root];
  for (let current = queue.shift(); current; current = queue.shift()) {
    for (const link of links.filter((candidate) => candidate.cause === current)) {
      if (reached.has(link.effect)) continue;
      reached.add(link.effect);
      queue.push(link.effect);
    }
  }
  return timeline.filter((event) => reached.has(event));
}

/** A root cause is a cause that is not itself the effect of an earlier event. */
function findChains(timeline: TimelineEvent[], links: Link[]): Chain[] {
  const effects = new Set(links.map((link) => link.effect));
  return timeline.flatMap((root) => {
    const first = links.find((link) => link.cause === root);
    if (!first || effects.has(root)) return [];
    return [{ root, relation: first.relation, consequences: followEffects(root, links, timeline) }];
  });
}

function nameEvent(event: TimelineEvent): string {
  return shortenText(event.finding.title, MAX_TITLE_IN_SENTENCE);
}

function nameConsequences(consequences: TimelineEvent[]): string {
  const named = consequences.slice(0, MAX_CONSEQUENCES_NAMED).map(nameEvent);
  const rest = consequences.length - named.length;
  return rest > 0
    ? `${named.join('; ')} ${OVERVIEW_TEXT.moreConsequences(rest)}`
    : named.join('; ');
}

function describeChain(chain: Chain): string {
  const cause = `${nameEvent(chain.root)} (${chain.root.finding.category})`;
  const consequences = nameConsequences(chain.consequences);
  return OVERVIEW_TEXT.rootCause(cause, consequences, chain.relation.explanation);
}

/** The events that belong to a chain, once each, in time order. */
function chainEvents(chains: Chain[], timeline: TimelineEvent[]): TimelineEvent[] {
  const members = new Set(chains.flatMap((chain) => [chain.root, ...chain.consequences]));
  return timeline.filter((event) => members.has(event));
}

function describeOrder(events: TimelineEvent[]): string {
  const phrases = describeEvents(events);
  return hasTimes(events)
    ? OVERVIEW_TEXT.orderWithTime(phrases)
    : OVERVIEW_TEXT.orderWithoutTime(phrases);
}

function describeEscalation(escalation: LoginEscalation): string {
  return OVERVIEW_TEXT.bruteForceSucceeded(
    escalation.failedLogins,
    escalation.address,
    escalation.user,
  );
}

/** Joins the sentences, most urgent first: an account takeover, the chain, its order, then shared actors. */
function assembleOverview(
  escalation: LoginEscalation | null,
  chains: Chain[],
  timeline: TimelineEvent[],
  lines: string[],
): string[] {
  return [
    ...(escalation ? [describeEscalation(escalation)] : []),
    ...chains.map(describeChain),
    ...(chains.length > 0 ? [describeOrder(chainEvents(chains, timeline))] : []),
    ...describeSharedEntities(lines, timeline),
  ]
    .map((sentence) => shortenText(sentence, MAX_OVERVIEW_LENGTH))
    .slice(0, MAX_OVERVIEW_ITEMS);
}

/**
 * Connects the events of one excerpt: root cause against symptoms, order in time, shared
 * addresses and users, and a login that follows a brute force. It is pure and deterministic,
 * and it only states what the log shows together with the relations in `content/correlations.ts`.
 */
export function correlateIncident(excerpt: string, findings: Finding[]): Correlation {
  const lines = splitLines(excerpt);
  const timeline = buildTimeline(lines, findings);
  const chains = findChains(timeline, findLinks(timeline));
  const escalation = findLoginEscalation(lines);
  return {
    overview: assembleOverview(escalation, chains, timeline, lines),
    rootCause: chains[0]?.root.finding ?? null,
    compromisedLogin: escalation !== null,
  };
}

/** The overview sentences alone, or an empty list when there is nothing to connect. */
export function correlateEvents(excerpt: string, findings: Finding[]): string[] {
  return correlateIncident(excerpt, findings).overview;
}
