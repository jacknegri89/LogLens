import type { SelectedEvent } from './contextSelection';
import type { NormalizedLogEvent } from '../parser/normalizedEvent';

/**
 * Puts events in the order they happened. A log merged from several sources is not in time
 * order, so events with a trustworthy full date are sorted by it; an event with no usable time
 * takes its place from the events around it in the file, and is marked as such, because a cause
 * can only be placed before an effect when the order itself can be trusted.
 */

/** How the position of an event in time was decided. */
export type TimeBasis = 'exact' | 'assumed' | 'inferred' | 'file-order';

export interface OrderedEvent {
  event: NormalizedLogEvent;
  /** The position of the event in the file, 0-based. */
  fileIndex: number;
  /** The position of the event in time order, 0-based. */
  position: number;
  /** The number the sort used: milliseconds since the epoch, or a position when there is no time. */
  orderKey: number;
  timeBasis: TimeBasis;
}

/** A step smaller than any real gap, so an event without a time stays after the one it follows. */
const INFERRED_STEP_MS = 0.001;

function hasUsableTime(event: NormalizedLogEvent, acceptPartial: boolean): boolean {
  if (event.epochMs === null) {
    return false;
  }
  if (event.timestampConfidence === 'exact' || event.timestampConfidence === 'assumed') {
    return true;
  }
  return acceptPartial && event.timestampConfidence === 'partial';
}

function basisOf(event: NormalizedLogEvent): TimeBasis {
  if (event.timestampConfidence === 'exact') {
    return 'exact';
  }
  return 'assumed';
}

interface Keyed {
  key: number | null;
  basis: TimeBasis;
}

/** Without any exact or assumed time, a log of syslog lines can still be ordered by its own clock. */
function shouldAcceptPartial(events: NormalizedLogEvent[]): boolean {
  return !events.some((event) => hasUsableTime(event, false));
}

function firstPass(events: NormalizedLogEvent[], acceptPartial: boolean): Keyed[] {
  return events.map((event): Keyed => {
    if (hasUsableTime(event, acceptPartial)) {
      return { key: event.epochMs, basis: basisOf(event) };
    }
    return { key: null, basis: 'inferred' };
  });
}

/** An event with no time follows the closest earlier event that has one; leading ones precede the first. */
function fillMissingKeys(keyed: Keyed[]): void {
  let previousKey: number | null = null;
  let stepsSincePrevious = 0;
  keyed.forEach((entry) => {
    if (entry.key !== null) {
      previousKey = entry.key;
      stepsSincePrevious = 0;
      return;
    }
    if (previousKey !== null) {
      stepsSincePrevious += 1;
      entry.key = previousKey + stepsSincePrevious * INFERRED_STEP_MS;
    }
  });
  const firstKnown = keyed.find((entry) => entry.key !== null);
  if (firstKnown === undefined || firstKnown.key === null) {
    return;
  }
  const leading = keyed.findIndex((entry) => entry === firstKnown);
  for (let index = leading - 1; index >= 0; index -= 1) {
    if (keyed[index].key === null) {
      keyed[index].key = firstKnown.key - (leading - index) * INFERRED_STEP_MS;
    }
  }
}

export function orderEvents(selected: SelectedEvent[]): OrderedEvent[] {
  const events = selected.map((entry) => entry.event);
  const keyed = firstPass(events, shouldAcceptPartial(events));
  fillMissingKeys(keyed);
  const noTimeAtAll = keyed.every((entry) => entry.key === null);
  const ordered = selected.map((entry, index): OrderedEvent => {
    if (noTimeAtAll) {
      return {
        event: entry.event,
        fileIndex: entry.index,
        position: 0,
        orderKey: index,
        timeBasis: 'file-order',
      };
    }
    return {
      event: entry.event,
      fileIndex: entry.index,
      position: 0,
      orderKey: keyed[index].key ?? index,
      timeBasis: keyed[index].basis,
    };
  });
  ordered.sort((a, b) => a.orderKey - b.orderKey || a.fileIndex - b.fileIndex);
  ordered.forEach((entry, position) => {
    entry.position = position;
  });
  return ordered;
}
