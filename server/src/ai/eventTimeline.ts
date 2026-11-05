import { extractLineFields } from '../parser/lineFields';
import type { Finding } from '../types/report';

/** The time found in a log line. `epochMs` is set only when the line carries a full date. */
export interface EventTime {
  clock: string;
  date: string | null;
  epochMs: number | null;
}

/** A finding placed in the log: where its evidence line is and when it happened. */
export interface TimelineEvent {
  finding: Finding;
  lineIndex: number;
  time: EventTime | null;
}

const ISO_TIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:[.,](\d+))?(Z|[+-]\d{2}:?\d{2})?$/;
const CLOCK_TIME = /\d{2}:\d{2}:\d{2}/;
export const MAX_TITLE_IN_SENTENCE = 70;

/** The non-empty lines of an excerpt, the same way the findings read them. */
export function splitLines(excerpt: string): string[] {
  return excerpt.split('\n').filter((line) => line.trim() !== '');
}

function normaliseZone(zone: string | undefined): string {
  if (!zone) {
    return 'Z';
  }
  if (zone.length === 5) {
    return `${zone.slice(0, 3)}:${zone.slice(3)}`;
  }
  return zone;
}

function parseIsoTime(value: string): EventTime | null {
  const match = ISO_TIME.exec(value);
  if (!match) {
    return null;
  }
  const [, date, clock, fraction, zone] = match;
  let milliseconds = '';
  if (fraction) {
    milliseconds = `.${fraction.slice(0, 3).padEnd(3, '0')}`;
  }
  const epochMs = Date.parse(`${date}T${clock}${milliseconds}${normaliseZone(zone)}`);
  if (Number.isNaN(epochMs)) {
    return { clock, date, epochMs: null };
  }
  return { clock, date, epochMs };
}

/** Syslog and bare clock times have no year, so they are shown but never used to reorder lines. */
function parseClockTime(value: string): EventTime | null {
  const clock = CLOCK_TIME.exec(value)?.[0];
  if (clock) {
    return { clock, date: null, epochMs: null };
  }
  return null;
}

function parseEventTime(line: string): EventTime | null {
  const field = extractLineFields(line).find((entry) => entry.startsWith('time '));
  if (!field) {
    return null;
  }
  const value = field.slice('time '.length);
  return parseIsoTime(value) ?? parseClockTime(value);
}

/** A finding that is not found in the excerpt goes after the real lines, in the order given. */
function locateLine(lines: string[], finding: Finding, position: number): number {
  const index = lines.findIndex((line) => line.startsWith(finding.evidence));
  if (index >= 0) {
    return index;
  }
  return lines.length + position;
}

function epochOf(event: TimelineEvent): number {
  return event.time?.epochMs ?? 0;
}

/**
 * Orders by timestamp when every event has a full date, so a log merged from several
 * sources is still read in time order. Otherwise the order of the lines is used.
 */
function sortChronologically(events: TimelineEvent[]): TimelineEvent[] {
  const allDated = events.every((event) => event.time?.epochMs != null);
  const byLine = (a: TimelineEvent, b: TimelineEvent) => a.lineIndex - b.lineIndex;
  const byTime = (a: TimelineEvent, b: TimelineEvent) => epochOf(a) - epochOf(b) || byLine(a, b);
  if (allDated) {
    return [...events].sort(byTime);
  }
  return [...events].sort(byLine);
}

export function buildTimeline(lines: string[], findings: Finding[]): TimelineEvent[] {
  const events = findings.map((finding, position): TimelineEvent => {
    const lineIndex = locateLine(lines, finding, position);
    const line = lines[lineIndex] ?? finding.evidence;
    return { finding, lineIndex, time: parseEventTime(line) };
  });
  return sortChronologically(events);
}

/** Cuts at the last whole word that fits, so a sentence never ends in half a word. */
export function shortenText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  const room = text.slice(0, maxLength - 3);
  const lastSpace = room.lastIndexOf(' ');
  let kept = room;
  if (lastSpace > maxLength / 2) {
    kept = room.slice(0, lastSpace);
  }
  return `${kept}...`;
}

/** The date is shown only when the events do not all happen on the same day. */
function needsDate(events: TimelineEvent[]): boolean {
  const dates = new Set(events.map((event) => event.time?.date).filter((date) => date != null));
  return dates.size > 1;
}

function timeLabel(event: TimelineEvent, withDate: boolean): string {
  const { time } = event;
  if (!time) {
    return '';
  }
  if (withDate && time.date) {
    return `${time.date} ${time.clock} `;
  }
  return `${time.clock} `;
}

/** "09:14:07 connect ECONNREFUSED 10.0.2.15:5432 (Database)": one event as a short phrase. */
export function describeEvents(events: TimelineEvent[]): string[] {
  const withDate = needsDate(events);
  return events.map((event) => {
    const title = shortenText(event.finding.title, MAX_TITLE_IN_SENTENCE);
    return `${timeLabel(event, withDate)}${title} (${event.finding.category})`;
  });
}

/** True when at least one event carries a time, so the order can be stated with clock times. */
export function hasTimes(events: TimelineEvent[]): boolean {
  return events.some((event) => event.time !== null);
}
