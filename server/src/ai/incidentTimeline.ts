import type { Severity, TimelineEntry, TimelineRole } from '../types/report';
import { MAX_TITLE_IN_SENTENCE, shortenText, type TimelineEvent } from './eventTimeline';

export const MAX_TIMELINE_ENTRIES = 8;
const MAX_TIMELINE_EVIDENCE_LENGTH = 300;
const MIN_FINDINGS_FOR_TIMELINE = 2;

/** A root cause with the events that follow from it, as the correlation layer found them. */
export interface CausalChain {
  root: TimelineEvent;
  consequences: TimelineEvent[];
}

const ROLE_PRIORITY: Record<TimelineRole, number> = { root: 0, effect: 1, independent: 2 };

/** Each effect belongs to the first chain that reaches it. */
function mapEffectsToRoots(chains: CausalChain[]): Map<TimelineEvent, TimelineEvent> {
  const rootOfEffect = new Map<TimelineEvent, TimelineEvent>();
  for (const chain of chains) {
    for (const effect of chain.consequences) {
      if (!rootOfEffect.has(effect)) {
        rootOfEffect.set(effect, chain.root);
      }
    }
  }
  return rootOfEffect;
}

function roleOf(
  event: TimelineEvent,
  chains: CausalChain[],
  rootOfEffect: Map<TimelineEvent, TimelineEvent>,
): TimelineRole {
  if (chains.some((chain) => chain.root === event)) {
    return 'root';
  }
  if (rootOfEffect.has(event)) {
    return 'effect';
  }
  return 'independent';
}

/** Cuts to the limit keeping roots and effects first, then restores the time order. */
function keepMostRelevant(
  events: TimelineEvent[],
  roles: Map<TimelineEvent, TimelineRole>,
): TimelineEvent[] {
  const priority = (event: TimelineEvent) => ROLE_PRIORITY[roles.get(event) ?? 'independent'];
  const kept = new Set(
    [...events].sort((a, b) => priority(a) - priority(b)).slice(0, MAX_TIMELINE_ENTRIES),
  );
  return events.filter((event) => kept.has(event));
}

function toEntry(event: TimelineEvent, role: TimelineRole, causedBy?: number): TimelineEntry {
  const { finding, time } = event;
  const timeFields: { time?: string } = {};
  if (time) {
    timeFields.time = time.clock;
  }
  const entry: TimelineEntry = {
    ...timeFields,
    title: shortenText(finding.title, MAX_TITLE_IN_SENTENCE),
    category: finding.category,
    severity: finding.severity as Severity,
    role,
    evidence: finding.evidence.slice(0, MAX_TIMELINE_EVIDENCE_LENGTH),
  };
  if (causedBy !== undefined) {
    entry.causedBy = causedBy;
  }
  return entry;
}

/**
 * The events in time order with their role in the incident, so the interface can draw
 * which event caused which. An effect points at the index of its root in the same list.
 * Fewer than two events have nothing to connect, so they give an empty list.
 */
export function buildTimelineEntries(
  timeline: TimelineEvent[],
  chains: CausalChain[],
): TimelineEntry[] {
  if (timeline.length < MIN_FINDINGS_FOR_TIMELINE) {
    return [];
  }
  const rootOfEffect = mapEffectsToRoots(chains);
  const roles = new Map(
    timeline.map((event) => [event, roleOf(event, chains, rootOfEffect)] as const),
  );
  const events = keepMostRelevant(timeline, roles);
  return events.map((event) => {
    const root = rootOfEffect.get(event);
    let rootIndex = -1;
    if (root !== undefined) {
      rootIndex = events.indexOf(root);
    }
    let causeIndex: number | undefined;
    if (rootIndex >= 0) {
      causeIndex = rootIndex;
    }
    return toEntry(event, roles.get(event) ?? 'independent', causeIndex);
  });
}
