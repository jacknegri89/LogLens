import {
  CAUSAL_RELATIONS,
  MAX_OVERVIEW_ITEMS,
  MAX_OVERVIEW_LENGTH,
  type CausalRelation,
  type EventMatcher,
} from '../content/correlations';
import { overviewText, relationExplanation } from '../content/localized';
import { DEFAULT_LANGUAGE, type Language } from '../types/language';
import type { Finding, TimelineEntry } from '../types/report';
import {
  buildTimeline,
  describeEvents,
  hasTimes,
  MAX_TITLE_IN_SENTENCE,
  shortenText,
  splitLines,
  type TimelineEvent,
} from './eventTimeline';
import { buildTimelineEntries } from './incidentTimeline';
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
  /** The events in time order with root, effect or independent role. Empty with fewer than two events. */
  timeline: TimelineEntry[];
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

const MAX_CONSEQUENCES_NAMED = 2;

/** True when a finding fits one of the matchers: its category, and its evidence when the matcher asks for it. */
export function matchesAny(matchers: EventMatcher[], finding: Finding): boolean {
  return matchers.some(
    (matcher) =>
      matcher.categories.includes(finding.category) &&
      (matcher.evidence === undefined || matcher.evidence.test(finding.evidence)),
  );
}

/** The relation of the knowledge base that says the first finding can cause the second, if there is one. */
export function findRelation(cause: Finding, effect: Finding): CausalRelation | undefined {
  return CAUSAL_RELATIONS.find(
    (relation) => matchesAny(relation.causes, cause) && matchesAny(relation.effects, effect),
  );
}

/** Pairs where the cause comes strictly BEFORE the effect: an earlier symptom is never blamed on a later event. */
function findLinks(timeline: TimelineEvent[]): Link[] {
  return timeline.flatMap((cause, causeIndex) =>
    timeline.slice(causeIndex + 1).flatMap((effect) => {
      const relation = findRelation(cause.finding, effect.finding);
      if (relation) {
        return [{ cause, effect, relation }];
      }
      return [];
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
      if (reached.has(link.effect)) {
        continue;
      }
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
    if (!first || effects.has(root)) {
      return [];
    }
    return [{ root, relation: first.relation, consequences: followEffects(root, links, timeline) }];
  });
}

function nameEvent(event: TimelineEvent): string {
  return shortenText(event.finding.title, MAX_TITLE_IN_SENTENCE);
}

function nameConsequences(consequences: TimelineEvent[], language: Language): string {
  const named = consequences.slice(0, MAX_CONSEQUENCES_NAMED).map(nameEvent);
  const rest = consequences.length - named.length;
  if (rest > 0) {
    return `${named.join('; ')} ${overviewText(language).moreConsequences(rest)}`;
  }
  return named.join('; ');
}

function describeChain(chain: Chain, language: Language): string {
  const cause = `${nameEvent(chain.root)} (${chain.root.finding.category})`;
  const consequences = nameConsequences(chain.consequences, language);
  const explanation = relationExplanation(chain.relation, language);
  return overviewText(language).rootCause(cause, consequences, explanation);
}

/** The events that belong to a chain, once each, in time order. */
function chainEvents(chains: Chain[], timeline: TimelineEvent[]): TimelineEvent[] {
  const members = new Set(chains.flatMap((chain) => [chain.root, ...chain.consequences]));
  return timeline.filter((event) => members.has(event));
}

function describeOrder(events: TimelineEvent[], language: Language): string {
  const phrases = describeEvents(events);
  const text = overviewText(language);
  if (hasTimes(events)) {
    return text.orderWithTime(phrases);
  }
  return text.orderWithoutTime(phrases);
}

function describeEscalation(escalation: LoginEscalation, language: Language): string {
  return overviewText(language).bruteForceSucceeded(
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
  language: Language,
): string[] {
  const sentences: string[] = [];
  if (escalation) {
    sentences.push(describeEscalation(escalation, language));
  }
  sentences.push(...chains.map((chain) => describeChain(chain, language)));
  if (chains.length > 0) {
    sentences.push(describeOrder(chainEvents(chains, timeline), language));
  }
  sentences.push(...describeSharedEntities(lines, timeline, language));
  return sentences
    .map((sentence) => shortenText(sentence, MAX_OVERVIEW_LENGTH))
    .slice(0, MAX_OVERVIEW_ITEMS);
}

/**
 * Connects the events of one excerpt: root cause against symptoms, order in time, shared
 * addresses and users, and a login that follows a brute force. It is pure and deterministic,
 * and it only states what the log shows together with the relations in `content/correlations.ts`.
 */
export function correlateIncident(
  excerpt: string,
  findings: Finding[],
  language: Language = DEFAULT_LANGUAGE,
): Correlation {
  const lines = splitLines(excerpt);
  const timeline = buildTimeline(lines, findings);
  const chains = findChains(timeline, findLinks(timeline));
  const escalation = findLoginEscalation(lines);
  return {
    overview: assembleOverview(escalation, chains, timeline, lines, language),
    rootCause: chains[0]?.root.finding ?? null,
    compromisedLogin: escalation !== null,
    timeline: buildTimelineEntries(timeline, chains),
  };
}

/** The overview sentences alone, or an empty list when there is nothing to connect. */
export function correlateEvents(
  excerpt: string,
  findings: Finding[],
  language: Language = DEFAULT_LANGUAGE,
): string[] {
  return correlateIncident(excerpt, findings, language).overview;
}
