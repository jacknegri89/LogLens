/**
 * Pointing at lines of the original log from the report. A piece of evidence is a link
 * (`#log-12` or `#log-12-15`); the original log reads the hash, opens itself and highlights those
 * lines. The log is cut into three parts instead of one element per line, so a log of a hundred
 * thousand lines costs three text nodes.
 */

export interface LineRange {
  /** 1-based first line. */
  start: number;
  /** 1-based last line, never before `start`. */
  end: number;
}

const HASH_PATTERN = /^#log-(\d{1,9})(?:-(\d{1,9}))?$/;

/** The hash that points at the lines of a piece of evidence. */
export function logHash(start: number, end: number = start): string {
  if (end > start) {
    return `#log-${start}-${end}`;
  }
  return `#log-${start}`;
}

/** The lines a hash points at, or null when it points at something else. */
export function parseLogHash(hash: string): LineRange | null {
  const match = HASH_PATTERN.exec(hash);
  if (match === null) {
    return null;
  }
  const start = Number(match[1]);
  if (start < 1) {
    return null;
  }
  const end = Math.max(start, Number(match[2] ?? start));
  return { start, end };
}

export interface SplitLog {
  before: string;
  focus: string;
  after: string;
}

/** The log cut around a range of lines. A range past the end of the log highlights nothing. */
export function splitLogAroundRange(rawLog: string, range: LineRange): SplitLog {
  const lines = rawLog.split('\n');
  if (range.start > lines.length) {
    return { before: rawLog, focus: '', after: '' };
  }
  const lastLine = Math.min(range.end, lines.length);
  const before = lines.slice(0, range.start - 1);
  const focus = lines.slice(range.start - 1, lastLine);
  const after = lines.slice(lastLine);
  return {
    before: joinWithTrailingBreak(before),
    focus: focus.join('\n'),
    after: joinWithLeadingBreak(after),
  };
}

function joinWithTrailingBreak(lines: string[]): string {
  if (lines.length === 0) {
    return '';
  }
  return `${lines.join('\n')}\n`;
}

function joinWithLeadingBreak(lines: string[]): string {
  if (lines.length === 0) {
    return '';
  }
  return `\n${lines.join('\n')}`;
}
