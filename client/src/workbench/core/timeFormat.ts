import type { ParsedLine, TimeMode } from '../types';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

/** HH:MM:SS.mmm of a moment, in UTC or in the browser's zone. */
export function formatClock(timestamp: number, mode: 'utc' | 'local'): string {
  const date = new Date(timestamp);
  if (mode === 'utc') {
    return date.toISOString().slice(11, 23);
  }
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${clock}.${pad(date.getMilliseconds(), 3)}`;
}

function gapSize(milliseconds: number): string {
  if (milliseconds < SECOND) {
    return `${Math.round(milliseconds)}ms`;
  }
  if (milliseconds < 10 * SECOND) {
    return `${Math.floor(milliseconds / 100) / 10}s`;
  }
  if (milliseconds < MINUTE) {
    return `${Math.floor(milliseconds / SECOND)}s`;
  }
  if (milliseconds < HOUR) {
    return `${Math.floor(milliseconds / MINUTE)}m`;
  }
  if (milliseconds < DAY) {
    return `${Math.floor(milliseconds / HOUR)}h`;
  }
  return `${Math.floor(milliseconds / DAY)}d`;
}

/** A gap read at a glance: +12ms, +1.2s, +42s, +3m, +2h, +4d; a step back in time gets a minus. */
export function formatGap(milliseconds: number): string {
  let sign = '+';
  if (milliseconds < 0) {
    sign = '-';
  }
  return `${sign}${gapSize(Math.abs(milliseconds))}`;
}

/**
 * The time of a line in the chosen mode, or '' when the line has none. In relative mode
 * `previous` is the closest earlier line that has a time; without one, the UTC clock anchors it.
 */
export function formatLineTime(
  line: ParsedLine,
  previous: ParsedLine | null,
  mode: TimeMode,
): string {
  if (line.timestamp === null) {
    return '';
  }
  if (mode !== 'relative') {
    return formatClock(line.timestamp, mode);
  }
  if (previous?.timestamp == null) {
    return formatClock(line.timestamp, 'utc');
  }
  return formatGap(line.timestamp - previous.timestamp);
}

/** For each position in `lines`, the position of the closest earlier line with a time, or -1. */
export function findPreviousTimed(lines: readonly ParsedLine[]): Int32Array {
  const previous = new Int32Array(lines.length);
  let lastTimed = -1;
  lines.forEach((line, position) => {
    previous[position] = lastTimed;
    if (line.timestamp !== null) {
      lastTimed = position;
    }
  });
  return previous;
}

/** The browser's time zone name, such as "Europe/Rome", or '' when the browser does not say. */
export function localZoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}
