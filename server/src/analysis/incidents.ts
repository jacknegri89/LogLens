import { FALLBACK_RULE, type RuleId } from '../content/rules';
import { pickRule } from '../ai/ruleMatching';
import type { ContextSelection, SelectedEvent } from './contextSelection';
import type { EventCorrelation } from './correlationTypes';
import { isAnomaly } from './eventCorrelation';
import type { NormalizedLogEvent } from '../parser/normalizedEvent';
import type { OrderedEvent } from './eventOrdering';
import { assessImpact, assessSeverity } from './incidentImpact';
import type { Incident } from './incidentTypes';
import { assessRootCause } from './rootCause';

/**
 * Splits the anomalies of a log into incidents. Two failures belong to the same incident only when
 * the log ties them: a causal link of at least probable certainty, an identifier they share, or
 * being the same recurring failure. Being close in time, or coming from the same address, never
 * puts two failures together, so one file can hold several independent incidents.
 */

const MAX_TITLE_LENGTH = 140;
const UNCATEGORISED = 'application';

/** A minimal union-find: groups event ids that end up in the same incident. */
class Partition {
  private readonly parent = new Map<string, string>();

  add(id: string): void {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
    }
  }

  find(id: string): string {
    let root = id;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root) as string;
    }
    this.parent.set(id, root);
    return root;
  }

  /** Puts two ids in one set; says whether they were in different sets before. */
  join(first: string, second: string): boolean {
    const firstRoot = this.find(first);
    const secondRoot = this.find(second);
    if (firstRoot === secondRoot) {
      return false;
    }
    this.parent.set(secondRoot, firstRoot);
    return true;
  }

  components(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      result.set(root, [...(result.get(root) ?? []), id]);
    }
    return result;
  }
}

/** The events an incident can be made of: every anomaly, and the changes that are linked to one. */
function incidentNodeIds(
  correlation: EventCorrelation,
  selectedById: Map<string, SelectedEvent>,
  excluded: Set<string>,
): Set<string> {
  const nodes = new Set<string>();
  for (const entry of correlation.ordered) {
    if (excluded.has(entry.event.eventId)) {
      continue;
    }
    if (isAnomaly(selectedById.get(entry.event.eventId))) {
      nodes.add(entry.event.eventId);
    }
  }
  for (const link of correlation.links) {
    const sourceIsChange = selectedById.get(link.sourceEventId)?.significant === 'change';
    if (sourceIsChange && link.causal && link.certainty !== 'possible') {
      nodes.add(link.sourceEventId);
    }
  }
  return nodes;
}

/** Failures within a second of each other, in the same place, are grouped when the log gives no reason to split them. */
const PROXIMITY_MS = 1000;

/**
 * The same place: the same service, or one of them names no service (a name read from a line is
 * not always a service, so a missing name does not split a story).
 */
function sameSourceOf(first: NormalizedLogEvent, second: NormalizedLogEvent): boolean {
  if (first.service === null || second.service === null) {
    return true;
  }
  return first.service === second.service;
}

/** The identifier kinds that say two events are about different things when their values differ. */
function entityConflict(first: NormalizedLogEvent, second: NormalizedLogEvent): boolean {
  const kinds = ['orderId', 'requestId', 'traceId', 'sessionId'] as const;
  return kinds.some((kind) => {
    const left = first[kind];
    const right = second[kind];
    return left !== null && right !== null && left !== right;
  });
}

/**
 * Logs without identifiers have nothing to tie their failures together but where and when they
 * happened. Consecutive failures of one service (or of none) within a second are put
 * in one incident, and the incident says so: this is grouping, never a causal claim.
 * Returns the ids that were joined this way.
 */
function groupByProximity(
  correlation: EventCorrelation,
  nodes: Set<string>,
  partition: Partition,
): Set<string> {
  const joined = new Set<string>();
  const timed = correlation.ordered.filter(
    (entry) =>
      nodes.has(entry.event.eventId) &&
      (entry.timeBasis === 'exact' || entry.timeBasis === 'assumed'),
  );
  for (let index = 1; index < timed.length; index += 1) {
    const previous = timed[index - 1];
    const current = timed[index];
    const close = current.orderKey - previous.orderKey <= PROXIMITY_MS;
    const sameSource = sameSourceOf(previous.event, current.event);
    if (!close || !sameSource || entityConflict(previous.event, current.event)) {
      continue;
    }
    if (partition.join(previous.event.eventId, current.event.eventId)) {
      joined.add(previous.event.eventId);
      joined.add(current.event.eventId);
    }
  }
  return joined;
}

interface Partitioned {
  partition: Partition;
  timeJoined: Set<string>;
}

function partitionNodes(correlation: EventCorrelation, nodes: Set<string>): Partitioned {
  const partition = new Partition();
  nodes.forEach((id) => partition.add(id));
  for (const link of correlation.links) {
    const bothInside = nodes.has(link.sourceEventId) && nodes.has(link.targetEventId);
    if (bothInside && link.causal && link.certainty !== 'possible') {
      partition.join(link.sourceEventId, link.targetEventId);
    }
  }
  const sharedStories = [...correlation.groups, ...correlation.recurrences];
  for (const story of sharedStories) {
    const members = story.eventIds.filter((id) => nodes.has(id));
    for (let index = 1; index < members.length; index += 1) {
      partition.join(members[0], members[index]);
    }
  }
  const timeJoined = groupByProximity(correlation, nodes, partition);
  return { partition, timeJoined };
}

/** The events of the same entities as the incident (the payment of an order that failed later). */
function contextEventsOf(
  nodeIds: string[],
  correlation: EventCorrelation,
  selectedById: Map<string, SelectedEvent>,
): string[] {
  const inside = new Set(nodeIds);
  const context = new Set<string>();
  for (const group of correlation.groups) {
    if (!group.eventIds.some((id) => inside.has(id))) {
      continue;
    }
    for (const id of group.eventIds) {
      const significant = selectedById.get(id)?.significant;
      if (!inside.has(id) && significant !== undefined && significant !== null) {
        context.add(id);
      }
    }
  }
  return [...context];
}

function entriesOf(ids: string[], correlation: EventCorrelation): OrderedEvent[] {
  const wanted = new Set(ids);
  return correlation.ordered.filter((entry) => wanted.has(entry.event.eventId));
}

/** Rules whose category names a guess about the layer ("Network") that one line cannot support. */
const NEUTRAL_CATEGORY: Partial<Record<RuleId, string>> = {
  timeout: 'Timeout',
  'client-error': 'Application',
};
const REGRESSION_CATEGORY = 'Regression after a change';

function categoryOf(anomalies: OrderedEvent[], rootKind: string): string {
  if (rootKind === 'change') {
    return REGRESSION_CATEGORY;
  }
  for (const entry of anomalies) {
    const rule = pickRule(entry.event.raw.slice(0, 800));
    if (rule !== FALLBACK_RULE) {
      return NEUTRAL_CATEGORY[rule.id] ?? rule.category;
    }
  }
  return UNCATEGORISED;
}

function titleOf(rootKind: string, rootSummary: string, anomalies: OrderedEvent[]): string {
  const first = anomalies[0]?.event.message ?? rootSummary;
  if (rootKind === 'change') {
    return `Failures after: ${rootSummary}`.slice(0, MAX_TITLE_LENGTH);
  }
  return first.slice(0, MAX_TITLE_LENGTH);
}

function timestampRange(entries: OrderedEvent[]): { first: string | null; last: string | null } {
  const timed = entries.filter(
    (entry) => entry.event.epochMs !== null && entry.event.timestamp !== null,
  );
  if (timed.length === 0) {
    return { first: null, last: null };
  }
  const sorted = [...timed].sort(
    (a, b) => (a.event.epochMs as number) - (b.event.epochMs as number),
  );
  return {
    first: sorted[0].event.timestamp,
    last: sorted[sorted.length - 1].event.timestamp,
  };
}

function buildIncident(
  nodeIds: string[],
  correlation: EventCorrelation,
  selectedById: Map<string, SelectedEvent>,
  groupedByTime: boolean,
): Omit<Incident, 'id'> {
  const nodeEntries = entriesOf(nodeIds, correlation);
  const anomalies = nodeEntries.filter((entry) => isAnomaly(selectedById.get(entry.event.eventId)));
  const anomalyIds = anomalies.map((entry) => entry.event.eventId);
  const { rootCause, alternatives } = assessRootCause({
    nodeIds,
    anomalyIds,
    correlation,
    selectedById,
  });
  const contextIds = contextEventsOf(nodeIds, correlation, selectedById);
  const allEntries = entriesOf([...nodeIds, ...contextIds], correlation);
  const impact = assessImpact(allEntries, anomalies, selectedById);
  const nodeSet = new Set(nodeIds);
  const range = timestampRange(allEntries);
  return {
    title: titleOf(rootCause.kind, rootCause.summary, anomalies),
    category: categoryOf(anomalies, rootCause.kind),
    anomalyEventIds: nodeEntries.map((entry) => entry.event.eventId),
    contextEventIds: contextIds,
    symptomEventIds: anomalyIds.filter((id) => id !== rootCause.sourceEventId),
    services: [
      ...new Set(
        anomalies.map((entry) => entry.event.service).filter((s): s is string => s !== null),
      ),
    ],
    firstTimestamp: range.first,
    lastTimestamp: range.last,
    rootCause,
    alternatives,
    impact,
    severity: assessSeverity(impact, anomalies, selectedById),
    groupedByTime,
    linkIds: correlation.links
      .filter((link) => nodeSet.has(link.sourceEventId) && nodeSet.has(link.targetEventId))
      .map((link) => link.id),
  };
}

/**
 * The incidents of a log, the first one to happen first.
 *
 * @param excludedEventIds events that are not incidents even though they look like failures: a
 *   line that tries to instruct the analyser is reported as such, not analysed as a failure.
 */
export function buildIncidents(
  selection: ContextSelection,
  correlation: EventCorrelation,
  excludedEventIds: Set<string> = new Set(),
): Incident[] {
  const selectedById = new Map(selection.selected.map((entry) => [entry.event.eventId, entry]));
  const nodes = incidentNodeIds(correlation, selectedById, excludedEventIds);
  const { partition, timeJoined } = partitionNodes(correlation, nodes);
  const components = [...partition.components().values()];
  const positionOf = new Map(
    correlation.ordered.map((entry) => [entry.event.eventId, entry.position]),
  );
  const earliest = (ids: string[]): number => Math.min(...ids.map((id) => positionOf.get(id) ?? 0));
  components.sort((a, b) => earliest(a) - earliest(b));
  return components.map((nodeIds, index) => ({
    id: `I${index + 1}`,
    ...buildIncident(
      nodeIds,
      correlation,
      selectedById,
      nodeIds.some((id) => timeJoined.has(id)),
    ),
  }));
}
