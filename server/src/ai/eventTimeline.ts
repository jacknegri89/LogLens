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
const MAX_TITLE_IN_SENTENCE = 40;

/** The non-empty lines of an excerpt, the same way the findings read them. */
export function splitLines(excerpt: string): string[] {
  return excerpt.split('\n').filter((line) => line.trim() !== '');
}

function normaliseZone(zone: string | undefined): string {
  if (!zone) return 'Z';
  return zone.length === 5 ? `${zone.slice(0, 3)}:${zone.slice(3)}` : zone;
}

function parseIsoTime(value: string): EventTime | null {
  const match = ISO_TIME.exec(value);
  if (!match) return null;
  const [, date, clock, fraction, zone] = match;
  const milliseconds = fraction ? `.${fraction.slice(0, 3).padEnd(3, '0')}` : '';
  const epochMs = Date.parse(`${date}T${clock}${milliseconds}${normaliseZone(zone)}`);
  return { clock, date, epochMs: Number.isNaN(epochMs) ? null : epochMs };
}

/** Syslog and bare clock times have no year, so they are shown but never used to reorder lines. */
function parseClockTime(value: string): EventTime | null {
  const clock = CLOCK_TIME.exec(value)?.[0];
  return clock ? { clock, date: null, epochMs: null } : null;
}

function parseEventTime(line: string): EventTime | null {
  const field = extractLineFields(line).find((entry) => entry.startsWith('time '));
  if (!field) return null;
  const value = field.slice('time '.length);
  return parseIsoTime(value) ?? parseClockTime(value);
}

/** A finding that is not found in the excerpt goes after the real lines, in the order given. */
function locateLine(lines: string[], finding: Finding, position: number): number {
  const index = lines.findIndex((line) => line.startsWith(finding.evidence));
  return index >= 0 ? index : lines.length + position;
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
  return [...events].sort(allDated ? byTime : byLine);
}

export function buildTimeline(lines: string[], findings: Finding[]): TimelineEvent[] {
  const events = findings.map((finding, position): TimelineEvent => {
    const lineIndex = locateLine(lines, finding, position);
    const line = lines[lineIndex] ?? finding.evidence;
    return { finding, lineIndex, time: parseEventTime(line) };
  });
  return sortChronologically(events);
}

export function shortenText(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 3)}...`;
}

/** The date is shown only when the events do not all happen on the same day. */
function needsDate(events: TimelineEvent[]): boolean {
  const dates = new Set(events.map((event) => event.time?.date).filter((date) => date != null));
  return dates.size > 1;
}

function timeLabel(event: TimelineEvent, withDate: boolean): string {
  const { time } = event;
  if (!time) return '';
  return withDate && time.date ? `${time.date} ${time.clock} ` : `${time.clock} `;
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
