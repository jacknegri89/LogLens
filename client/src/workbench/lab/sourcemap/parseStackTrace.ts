export interface StackFrame {
  /** The line as pasted, trimmed. */
  raw: string;
  /** The function name written in the trace (usually the minified one), or null. */
  functionName: string | null;
  file: string;
  /** 1-based, or null for frames without a position such as `at Array.map (<anonymous>)`. */
  line: number | null;
  column: number | null;
}

/** A very long line is not a stack frame, and the limit keeps the patterns below cheap. */
const MAX_LINE_LENGTH = 2000;

const CHROME_NAMED = /^at\s+(.*?)\s+\((.*)\)$/;
const CHROME_PLAIN = /^at\s+(\S.*)$/;
const FIREFOX = /^([^@\s][^@]*)?@(.+)$/;
const LOCATION = /^(.+):(\d+):(\d+)$/;

function locate(location: string): Pick<StackFrame, 'file' | 'line' | 'column'> {
  const match = location.match(LOCATION);
  if (!match) return { file: location, line: null, column: null };
  return { file: match[1], line: Number(match[2]), column: Number(match[3]) };
}

function chromeFrame(raw: string): StackFrame | null {
  const named = raw.match(CHROME_NAMED);
  if (named) return { raw, functionName: named[1], ...locate(named[2]) };
  const plain = raw.match(CHROME_PLAIN);
  return plain ? { raw, functionName: null, ...locate(plain[1]) } : null;
}

function firefoxFrame(raw: string): StackFrame | null {
  const match = raw.match(FIREFOX);
  if (!match || !LOCATION.test(match[2])) return null;
  return { raw, functionName: match[1]?.trim() || null, ...locate(match[2]) };
}

/** One line as a frame in the Chrome/Node (`at fn (file:1:2)`) or Firefox/Safari (`fn@file:1:2`) format. */
export function parseFrameLine(line: string): StackFrame | null {
  const raw = line.trim();
  if (raw === '' || raw.length > MAX_LINE_LENGTH) return null;
  return chromeFrame(raw) ?? firefoxFrame(raw);
}

/** Every frame of a pasted trace, in order. Lines that are not frames, such as the error message, are left out. */
export function parseStackTrace(text: string): StackFrame[] {
  const frames: StackFrame[] = [];
  for (const line of text.split(/\r?\n/)) {
    const frame = parseFrameLine(line);
    if (frame) frames.push(frame);
  }
  return frames;
}
