import type { TimelineEntry } from './types';

/** One red thread on the evidence board: from the card of a root cause to the card of its effect. */
export interface ThreadLink {
  rootIndex: number;
  effectIndex: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * The threads to draw. An effect gets one only when `causedBy` points at a root entry of the
 * same timeline, so a malformed index never draws a thread to nowhere.
 */
export function threadLinks(entries: TimelineEntry[]): ThreadLink[] {
  return entries.flatMap((entry, effectIndex) => {
    const rootIndex = entry.causedBy;
    if (entry.role !== 'effect' || rootIndex === undefined) {
      return [];
    }
    if (entries[rootIndex]?.role !== 'root') {
      return [];
    }
    return [{ rootIndex, effectIndex }];
  });
}

/** Whether the board has both a chain of events and events with no link to it. */
export function hasSetAsideEntries(entries: TimelineEntry[]): boolean {
  const hasChain = entries.some((entry) => entry.role !== 'independent');
  return hasChain && entries.some((entry) => entry.role === 'independent');
}

/**
 * A thread tied between two pins: almost straight, drooping a little under its own weight.
 * A thread that runs mostly downwards bows sideways instead, so it never looks ruled.
 */
export function threadPath(from: Point, to: Point): string {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const sag = Math.min(14 + distance * 0.1, 60);
  let steepness = 0;
  if (distance !== 0) {
    steepness = Math.abs(to.y - from.y) / distance;
  }
  const controlX = (from.x + to.x) / 2 - sag * steepness;
  const controlY = (from.y + to.y) / 2 + sag * (1 - steepness * 0.7);
  return `M${round(from.x)} ${round(from.y)} Q${round(controlX)} ${round(controlY)} ${round(to.x)} ${round(to.y)}`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
