import type { NormalizedLogEvent } from '../parser/normalizedEvent';
import type { SelectedEvent } from './contextSelection';
import type { CausalLink, EventCorrelation, EvidenceRef } from './correlationTypes';
import { evidenceOf, isAnomaly, signatureOf } from './eventCorrelation';
import type { OrderedEvent } from './eventOrdering';
import type { Contradiction, Hypothesis, RootCauseStatus } from './incidentTypes';

/**
 * Root cause analysis from evidence. It builds several hypotheses for an incident, checks each
 * against the links the correlation engine found and against what contradicts it, and picks the
 * best supported one. A cause is called `confirmed` only when the log itself shows it.
 *
 * It never forces an answer: when no hypothesis has support, the root cause is `insufficient`.
 */

/** Share of the incident's failures that a cause must explain to be called confirmed. */
const CONFIRMED_COVERAGE = 0.8;
/** Share below which a cause is only worth checking. */
const PROBABLE_COVERAGE = 0.5;
const MAX_ALTERNATIVES = 3;
const MAX_SUPPORTING_EVIDENCE = 6;
const MAX_CONTRADICTIONS = 3;
const MAX_SUMMARY_LENGTH = 300;

const STATUS_RANK: Record<RootCauseStatus, number> = {
  confirmed: 3,
  probable: 2,
  unverified: 1,
  insufficient: 0,
};

export interface RootCauseInput {
  /** The events the incident is made of: its anomalies and the changes linked to them. */
  nodeIds: string[];
  /** The anomalies among the nodes. */
  anomalyIds: string[];
  correlation: EventCorrelation;
  selectedById: Map<string, SelectedEvent>;
}

export interface RootCauseResult {
  rootCause: Hypothesis;
  alternatives: Hypothesis[];
}

interface Graph {
  outgoing: Map<string, CausalLink[]>;
  hasIncoming: Set<string>;
}

interface Candidate {
  hypothesis: Hypothesis;
  position: number;
}

function strongCausalLinks(input: RootCauseInput): CausalLink[] {
  const nodes = new Set(input.nodeIds);
  return input.correlation.links.filter(
    (link) =>
      link.causal &&
      link.certainty !== 'possible' &&
      nodes.has(link.sourceEventId) &&
      nodes.has(link.targetEventId),
  );
}

function buildGraph(links: CausalLink[]): Graph {
  const outgoing = new Map<string, CausalLink[]>();
  const hasIncoming = new Set<string>();
  for (const link of links) {
    outgoing.set(link.sourceEventId, [...(outgoing.get(link.sourceEventId) ?? []), link]);
    hasIncoming.add(link.targetEventId);
  }
  return { outgoing, hasIncoming };
}

/** Everything a source can reach by following strong causal links: its effects, direct or not. */
function reachableFrom(sourceId: string, graph: Graph): { ids: Set<string>; linkIds: string[] } {
  const ids = new Set<string>();
  const linkIds: string[] = [];
  const queue = [sourceId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const link of graph.outgoing.get(current) ?? []) {
      linkIds.push(link.id);
      if (!ids.has(link.targetEventId)) {
        ids.add(link.targetEventId);
        queue.push(link.targetEventId);
      }
    }
  }
  return { ids, linkIds };
}

function trimmed(text: string): string {
  return text.slice(0, MAX_SUMMARY_LENGTH);
}

/** Earlier failures of the same kind: if the problem was there before the change, the change is not why. */
function contradictionsFor(
  source: OrderedEvent,
  explainedIds: string[],
  input: RootCauseInput,
): Contradiction[] {
  const { ordered } = input.correlation;
  const notes: Contradiction[] = [];
  const seenSignatures = new Set<string>();
  for (const explainedId of explainedIds) {
    const explained = ordered.find((entry) => entry.event.eventId === explainedId);
    if (explained === undefined) {
      continue;
    }
    const signature = signatureOf(explained.event);
    if (seenSignatures.has(signature)) {
      continue;
    }
    seenSignatures.add(signature);
    const earlier = ordered.find(
      (entry) =>
        entry.position < source.position &&
        isAnomaly(input.selectedById.get(entry.event.eventId)) &&
        signatureOf(entry.event) === signature,
    );
    if (earlier !== undefined) {
      notes.push({
        code: 'failure-before-cause',
        eventId: earlier.event.eventId,
        line: earlier.event.originalLineStart,
      });
    }
  }
  return notes.slice(0, MAX_CONTRADICTIONS);
}

function statusOfCause(
  hasConfirmedLink: boolean,
  coverage: number,
  contradictions: Contradiction[],
): RootCauseStatus {
  if (hasConfirmedLink && coverage >= CONFIRMED_COVERAGE && contradictions.length === 0) {
    return 'confirmed';
  }
  if (coverage >= PROBABLE_COVERAGE || hasConfirmedLink) {
    return 'probable';
  }
  return 'unverified';
}

function supportingEvidence(
  source: OrderedEvent,
  directLinks: CausalLink[],
  input: RootCauseInput,
): EvidenceRef[] {
  const evidence: EvidenceRef[] = [evidenceOf(source.event, 'the candidate cause')];
  const seen = new Set<string>([source.event.eventId]);
  const strongestFirst = [...directLinks].sort(
    (a, b) => Number(b.certainty === 'confirmed') - Number(a.certainty === 'confirmed'),
  );
  for (const link of strongestFirst) {
    const target = input.correlation.ordered.find(
      (entry) => entry.event.eventId === link.targetEventId,
    );
    if (target === undefined || seen.has(target.event.eventId)) {
      continue;
    }
    seen.add(target.event.eventId);
    evidence.push(evidenceOf(target.event, link.evidence[1]?.note ?? 'an effect'));
    if (evidence.length >= MAX_SUPPORTING_EVIDENCE) {
      break;
    }
  }
  return evidence;
}

function isChange(eventId: string, input: RootCauseInput): boolean {
  return input.selectedById.get(eventId)?.significant === 'change';
}

/** A source of the causal graph: it causes something and nothing in the incident causes it. */
function chainHypotheses(input: RootCauseInput): Candidate[] {
  const graph = buildGraph(strongCausalLinks(input));
  const anomalySet = new Set(input.anomalyIds);
  const candidates: Candidate[] = [];
  for (const sourceId of graph.outgoing.keys()) {
    const source = input.correlation.ordered.find((entry) => entry.event.eventId === sourceId);
    if (source === undefined || graph.hasIncoming.has(sourceId)) {
      continue;
    }
    const reach = reachableFrom(sourceId, graph);
    const explainedIds = [...reach.ids].filter((id) => anomalySet.has(id));
    const directLinks = graph.outgoing.get(sourceId) ?? [];
    // The source of a dependency chain is itself one of the failures: it is not its own effect.
    let failuresToExplain = input.anomalyIds.length;
    if (anomalySet.has(sourceId)) {
      failuresToExplain -= 1;
    }
    const coverage = explainedIds.length / Math.max(1, failuresToExplain);
    const contradicting = contradictionsFor(source, explainedIds, input);
    let kind: Hypothesis['kind'] = 'dependency';
    if (isChange(sourceId, input)) {
      kind = 'change';
    } else if (source.event.attributes.exceptionClass !== undefined) {
      kind = 'exception';
    }
    candidates.push({
      position: source.position,
      hypothesis: {
        kind,
        sourceEventId: sourceId,
        summary: trimmed(source.event.message),
        status: statusOfCause(
          directLinks.some((link) => link.certainty === 'confirmed'),
          coverage,
          contradicting,
        ),
        explainedEventIds: explainedIds,
        supporting: supportingEvidence(source, directLinks, input),
        contradicting,
        linkIds: reach.linkIds,
      },
    });
  }
  return candidates;
}

function earliestAnomaly(input: RootCauseInput, accepts: (event: NormalizedLogEvent) => boolean) {
  return input.correlation.ordered.find(
    (entry) => input.anomalyIds.includes(entry.event.eventId) && accepts(entry.event),
  );
}

function exceptionSummary(event: NormalizedLogEvent): string {
  const name = event.attributes.exceptionClass;
  const text = event.attributes.exceptionMessage;
  if (name === undefined) {
    return trimmed(event.message);
  }
  if (text === undefined || text === '') {
    return trimmed(String(name));
  }
  return trimmed(`${String(name)}: ${String(text)}`);
}

/** The code threw: the exception says where, not why. A stack frame makes it probable, no more. */
function exceptionHypothesis(input: RootCauseInput): Candidate | null {
  const entry = earliestAnomaly(input, (event) => event.attributes.exceptionClass !== undefined);
  if (entry === undefined) {
    return null;
  }
  let status: RootCauseStatus = 'unverified';
  if (entry.event.attributes.topFrame !== undefined) {
    status = 'probable';
  }
  return {
    position: entry.position,
    hypothesis: {
      kind: 'exception',
      sourceEventId: entry.event.eventId,
      summary: exceptionSummary(entry.event),
      status,
      explainedEventIds: [entry.event.eventId],
      supporting: [evidenceOf(entry.event, 'the exception and its first stack frame')],
      contradicting: [],
      linkIds: [],
    },
  };
}

/** An attack attempt is confirmed as an attempt; the log alone never shows a compromise. */
function securityHypothesis(input: RootCauseInput): Candidate | null {
  const entry = earliestAnomaly(input, (event) => {
    const selected = input.selectedById.get(event.eventId);
    return selected?.anomaly?.reasons.includes('attack signature') === true;
  });
  if (entry === undefined) {
    return null;
  }
  return {
    position: entry.position,
    hypothesis: {
      kind: 'security',
      sourceEventId: entry.event.eventId,
      summary: trimmed(entry.event.message),
      status: 'confirmed',
      explainedEventIds: [entry.event.eventId],
      supporting: [evidenceOf(entry.event, 'a request carrying an attack signature')],
      contradicting: [],
      linkIds: [],
    },
  };
}

function unknownHypothesis(input: RootCauseInput): Candidate {
  const first = input.correlation.ordered.find((entry) =>
    input.anomalyIds.includes(entry.event.eventId),
  );
  return {
    position: first?.position ?? 0,
    hypothesis: {
      kind: 'unknown',
      sourceEventId: null,
      summary: 'The log shows the failure but not what caused it.',
      status: 'insufficient',
      explainedEventIds: [],
      supporting: [],
      contradicting: [],
      linkIds: [],
    },
  };
}

function compareCandidates(first: Candidate, second: Candidate): number {
  const byStatus = STATUS_RANK[second.hypothesis.status] - STATUS_RANK[first.hypothesis.status];
  if (byStatus !== 0) {
    return byStatus;
  }
  const byCoverage =
    second.hypothesis.explainedEventIds.length - first.hypothesis.explainedEventIds.length;
  if (byCoverage !== 0) {
    return byCoverage;
  }
  return first.position - second.position;
}

export function assessRootCause(input: RootCauseInput): RootCauseResult {
  const candidates: Candidate[] = chainHypotheses(input);
  const exception = exceptionHypothesis(input);
  const chainAlreadyCoversIt = candidates.some(
    (candidate) => candidate.hypothesis.sourceEventId === exception?.hypothesis.sourceEventId,
  );
  if (exception !== null && !chainAlreadyCoversIt) {
    candidates.push(exception);
  }
  const security = securityHypothesis(input);
  if (security !== null) {
    candidates.push(security);
  }
  if (candidates.length === 0) {
    candidates.push(unknownHypothesis(input));
  }
  candidates.sort(compareCandidates);
  const [best, ...others] = candidates;
  return {
    rootCause: best.hypothesis,
    alternatives: others.slice(0, MAX_ALTERNATIVES).map((candidate) => candidate.hypothesis),
  };
}
