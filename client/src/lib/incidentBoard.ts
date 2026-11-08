import type { Incident, TimelineEntry } from './types';

/**
 * The evidence board, drawn from the incidents instead of from the earlier rule categories, so the
 * board and the incident section tell the same story. The cards are a display selection: the full
 * timeline of each incident is in the incident itself.
 */

/** Cards shown for one incident: its cause and the first symptoms it set off. */
export const BOARD_CARDS_PER_INCIDENT = 5;
/** Cards shown on the whole board. */
export const BOARD_MAX_CARDS = 12;
/** Time as "HH:MM:SS" when the log gave a full ISO time. */
const CLOCK_START = 11;
const CLOCK_END = 19;

function clockOf(time: string | undefined): string | undefined {
  if (time === undefined) {
    return undefined;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(time)) {
    return time.slice(CLOCK_START, CLOCK_END);
  }
  return time;
}

function quoteOf(incident: Incident, eventId: string, fallback: string): string {
  const evidence = [...incident.rootCause.evidence, ...incident.secondarySymptoms];
  return evidence.find((item) => item.eventId === eventId)?.quote ?? fallback;
}

function entriesOf(incident: Incident): TimelineEntry[] {
  const cause = incident.timeline.find((item) => item.role === 'cause');
  const symptoms = incident.timeline.filter((item) => item.role === 'symptom');
  const base = { category: incident.category, severity: incident.severity };
  const make = (
    item: Incident['timeline'][number],
    role: TimelineEntry['role'],
    causedBy?: number,
  ): TimelineEntry => {
    const entry: TimelineEntry = {
      ...base,
      title: item.title,
      role,
      evidence: quoteOf(incident, item.eventId, item.title),
    };
    const time = clockOf(item.time);
    if (time !== undefined) {
      entry.time = time;
    }
    if (causedBy !== undefined) {
      entry.causedBy = causedBy;
    }
    return entry;
  };
  if (cause === undefined) {
    return symptoms.slice(0, BOARD_CARDS_PER_INCIDENT - 2).map((item) => make(item, 'independent'));
  }
  return [
    make(cause, 'root'),
    ...symptoms.slice(0, BOARD_CARDS_PER_INCIDENT - 1).map((item) => make(item, 'effect', 0)),
  ];
}

/** The board cards of every incident, the cause of each first, with `causedBy` as board indexes. */
export function boardEntriesFrom(incidents: Incident[]): TimelineEntry[] {
  const board: TimelineEntry[] = [];
  for (const incident of incidents) {
    const entries = entriesOf(incident);
    if (board.length + entries.length > BOARD_MAX_CARDS) {
      break;
    }
    const offset = board.length;
    for (const entry of entries) {
      if (entry.causedBy !== undefined) {
        entry.causedBy += offset;
      }
      board.push(entry);
    }
  }
  return board;
}
