import type { NormalizedLogEvent } from '../normalizedEvent';

/**
 * Reads the exception out of a multi-line record: Node.js, Python and Java stack traces. It adds
 * what the trace says (the exception class and message, the top frame, the root cause of a
 * `Caused by:` chain) to the event and never rewrites the raw text.
 */

const NODE_HEADLINE =
  /^(?:Uncaught |Unhandled )?([A-Z][\w$.]*(?:Error|Exception|Failure|Rejection))(?::\s*(.*))?$/;
const JAVA_HEADLINE =
  /^(?:Exception in thread "[^"]+" )?([a-z][\w$]*(?:\.[\w$]+)+(?:Exception|Error))(?::\s*(.*))?$/;
const PYTHON_FINAL = /^([A-Za-z_][\w.]*(?:Error|Exception|Warning|Interrupt|Exit)):\s*(.*)$/;
const CAUSED_BY = /^Caused by:\s*([\w$.]+(?:Exception|Error))(?::\s*(.*))?$/;
const NODE_FRAME = /^\s+at\s+(.{1,300})$/;
const PYTHON_FRAME = /^\s+File "([^"]{1,300})", line (\d+)(?:, in (\S+))?/;
const MAX_MESSAGE = 500;

interface ExceptionFacts {
  className: string;
  message: string;
  topFrame: string | null;
  frameCount: number;
  rootCause: string | null;
}

function headlineOf(lines: string[]): { className: string; message: string } | null {
  for (const line of lines) {
    const trimmed = line.trim();
    const match = JAVA_HEADLINE.exec(trimmed) ?? NODE_HEADLINE.exec(trimmed);
    if (match) {
      return { className: match[1], message: (match[2] ?? '').slice(0, MAX_MESSAGE) };
    }
  }
  return null;
}

function pythonFinalLine(lines: string[]): { className: string; message: string } | null {
  if (!lines.some((line) => line.startsWith('Traceback (most recent call last)'))) {
    return null;
  }
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const match = PYTHON_FINAL.exec(lines[index].trim());
    if (match && !lines[index].startsWith(' ')) {
      return { className: match[1], message: match[2].slice(0, MAX_MESSAGE) };
    }
  }
  return null;
}

function frames(lines: string[]): string[] {
  const found: string[] = [];
  for (const line of lines) {
    const python = PYTHON_FRAME.exec(line);
    if (python) {
      found.push(`${python[1]}:${python[2]}`);
      continue;
    }
    const node = NODE_FRAME.exec(line);
    if (node) {
      found.push(node[1]);
    }
  }
  return found;
}

/** The deepest "Caused by" of a chain: the exception that started it. */
function rootCauseOf(lines: string[]): string | null {
  let root: string | null = null;
  for (const line of lines) {
    const match = CAUSED_BY.exec(line.trim());
    if (match) {
      root = `${match[1]}: ${(match[2] ?? '').slice(0, MAX_MESSAGE)}`.trim();
    }
  }
  return root;
}

function exceptionFacts(lines: string[]): ExceptionFacts | null {
  const headline = pythonFinalLine(lines) ?? headlineOf(lines);
  if (headline === null) {
    return null;
  }
  const traceFrames = frames(lines);
  // Python lists the frames from the oldest call to the newest: the last one is where it failed.
  const isPython = lines.some((line) => line.startsWith('Traceback (most recent call last)'));
  let topFrame: string | null = traceFrames[0] ?? null;
  if (isPython) {
    topFrame = traceFrames[traceFrames.length - 1] ?? null;
  }
  return {
    className: headline.className,
    message: headline.message,
    topFrame,
    frameCount: traceFrames.length,
    rootCause: rootCauseOf(lines),
  };
}

/** Adds the exception facts to an event whose record contains a stack trace or an exception line. */
export function enrichFromStack(event: NormalizedLogEvent, lines: string[]): void {
  // The first line carries the log prefix ("2026-… ERROR [api] TypeError: …"); the parsed message
  // is that line without the prefix, so it can be read as a headline too.
  const facts = exceptionFacts([event.message, ...lines]);
  if (facts === null) {
    return;
  }
  event.attributes.exceptionClass = facts.className;
  if (facts.message !== '') {
    event.attributes.exceptionMessage = facts.message;
  }
  if (facts.topFrame !== null) {
    event.attributes.topFrame = facts.topFrame;
  }
  if (facts.frameCount > 0) {
    event.attributes.frameCount = facts.frameCount;
  }
  if (facts.rootCause !== null) {
    event.attributes.rootCause = facts.rootCause;
  }
  if (event.errorCode === null) {
    event.errorCode = facts.className;
  }
  // An exception with no level of its own is an error; a level the log wrote is left alone.
  if (event.level === 'unknown') {
    event.level = 'error';
  }
}
