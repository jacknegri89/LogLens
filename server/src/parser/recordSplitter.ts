/**
 * Groups the physical lines of a log into logical records. A stack trace of twenty lines, a
 * Windows event of fifteen or a message with an embedded line break is ONE record, so a later
 * stage never works on half of an exception. No line is dropped: every non-empty line belongs to
 * exactly one record, and the line numbers of the original file are kept.
 */

export interface RawRecord {
  /** 1-based line where the record starts. */
  lineStart: number;
  /** 1-based line where the record ends. */
  lineEnd: number;
  lines: string[];
}

export interface SplitOptions {
  /** A record that grows past this many lines is closed and a new one begins. */
  maxLinesPerRecord: number;
  /** The same limit counted in characters. */
  maxCharsPerRecord: number;
}

export const DEFAULT_SPLIT_OPTIONS: SplitOptions = {
  maxLinesPerRecord: 400,
  maxCharsPerRecord: 20_000,
};

const SAMPLE_LINES = 200;
/** Above this share of timestamped lines, an unrecognised line is read as part of the record before it. */
const TIMESTAMPED_SHARE_FOR_CONTINUATION = 0.4;

/** A line that begins with a time, a level or a known log prefix starts a new record. */
const RECORD_START_PATTERNS: RegExp[] = [
  /^\s{0,3}\[?\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}/,
  /^\s{0,3}\[?\d{2}\/[A-Z][a-z]{2}\/\d{4}/,
  /^<\d{1,3}>/,
  /^[A-Z][a-z]{2}\s{1,2}\d{1,2} \d{2}:\d{2}:\d{2} /,
  /^[EWIF]\d{4} \d{2}:\d{2}:\d{2}/,
  /^\d{1,3}(?:\.\d{1,3}){3} \S+ \S+ \[/,
  /^\d{2}:\d{2}:\d{2}/,
  /^\s{0,3}\d{10}(?:\.\d+)?\s/,
  /^\s{0,3}\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}/,
  /^(?:TRACE|DEBUG|INFO|NOTICE|WARN(?:ING)?|ERROR|ERR|FATAL|CRITICAL|CRIT|ALERT|EMERG|PANIC)\b[:\s\]|]/,
  /^\[(?:TRACE|DEBUG|INFO|NOTICE|WARN(?:ING)?|ERROR|FATAL|CRITICAL|CRIT)\]/i,
  /^\s*(?:time|ts|level|msg|timestamp)=\S/,
  // A whole JSON object on one line is always a record of its own.
  /^\s*\{.*\}\s*$/,
  // The start of a JSON object whose line was cut: it is not the continuation of the line before.
  /^\s*\{\s*"[\w.@-]{1,60}"\s*:/,
  // A pretty-printed JSON object opens with a brace alone on its line.
  /^\s*\{\s*$/,
  // Apache error log: [Wed Nov 04 10:00:01.123456 2026]
  /^\[[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{2}:\d{2}:\d{2}/,
  // Ruby logger: I, [2026-11-04T10:00:00.123456 #1]
  /^[DIWEFA], \[\d{4}-\d{2}-\d{2}/,
  // Redis: 1:M 04 Nov 2026 10:00:04.456
  /^\d+:[XCSM] \d{2} [A-Z][a-z]{2} \d{4}/,
  // Android logcat: 11-04 10:00:03.456
  /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\s/,
  // Serilog console: [10:00:04 ERR]
  /^\[\d{2}:\d{2}:\d{2} [A-Z]{3}\]/,
  // AWS load balancer: http 2026-11-04T10:00:03.123456Z app/...
  /^(?:https?|h2|wss?|grpcs?) \d{4}-\d{2}-\d{2}T/,
  // Linux audit: type=SYSCALL msg=audit(1697395202.789:36): ...
  /^type=[A-Z_]+ msg=audit\(/,
  // kubectl get events: "Warning  Failed   pod/x   message"
  /^(?:Normal|Warning)\s{2,}\S/,
  // IIS and other W3C extended logs announce themselves with directives.
  /^#(?:Software|Version|Date|Fields):/,
  // Docker Compose prefixes every line with the service: "web_1  | message" (not a stack frame).
  /^[\w.-]{1,60}\s+\| (?!\s+at\s|\s{2,}|Caused by)/,
];

/** The patterns above that carry a time: used to decide whether the log is a timestamped log. */
const TIMESTAMPED_LINE =
  /^\s{0,3}\[?(?:\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}|\d{2}\/[A-Z][a-z]{2}\/\d{4}|<\d{1,3}>|[A-Z][a-z]{2}\s{1,2}\d{1,2} \d{2}:\d{2}|[EWIF]\d{4} \d{2}:\d{2}|\d{10}\s)/;

/** Lines that can only continue an earlier record: stack frames, causes, indented code. */
const CONTINUATION_PATTERNS: RegExp[] = [
  /^\s+at\s/,
  /^\s+\.\.\. \d+ (?:more|common frames omitted)/,
  /^Caused by:/,
  /^\s+File "/,
  /^\t/,
  /^ {2,}\S/,
  // The closing brace of a pretty-printed JSON object.
  /^[}\]],?\s*$/,
];

const PYTHON_TRACEBACK_START = /^Traceback \(most recent call last\):/;
const JAVA_THREAD_EXCEPTION = /^Exception in thread "/;
const EXCEPTION_HEADLINE = /^[\w.$]+(?:Error|Exception|Warning)(?::|$)/;
const WINDOWS_XML_START = /<Event[\s>]/;
const WINDOWS_XML_END = /<\/Event>/;
/** A pretty-printed JSON object opens with a brace alone on its line and ends with one at the margin. */
const PRETTY_JSON_START = /^\s*\{\s*$/;
const PRETTY_JSON_END = /^\}\s*$/;
const WINDOWS_TEXT_START = /^Log Name:\s/;
/** A field line of a Windows event export: "Source:        Application Error". */
const WINDOWS_TEXT_FIELD = /^[A-Z][\w ]{0,30}:\s/;

/** A line that always opens a record: a prefix that carries a time or level, JSON, or a Windows event. */
function startsRecord(line: string): boolean {
  if (WINDOWS_XML_START.test(line) || WINDOWS_TEXT_START.test(line)) {
    return true;
  }
  return RECORD_START_PATTERNS.some((pattern) => pattern.test(line));
}

function continuesRecord(line: string): boolean {
  return CONTINUATION_PATTERNS.some((pattern) => pattern.test(line));
}

/** Whether most of the log is made of timestamped lines, which makes an unknown line a continuation. */
function isMostlyTimestamped(lines: string[]): boolean {
  const sample = lines.filter((line) => line.trim() !== '').slice(0, SAMPLE_LINES);
  if (sample.length === 0) {
    return false;
  }
  const stamped = sample.filter((line) => TIMESTAMPED_LINE.test(line)).length;
  return stamped / sample.length >= TIMESTAMPED_SHARE_FOR_CONTINUATION;
}

type OpenBlock =
  'none' | 'python-traceback' | 'windows-xml' | 'windows-text' | 'stack' | 'json-object';

interface SplitState {
  records: RawRecord[];
  current: RawRecord | null;
  block: OpenBlock;
  /** True while the open record began with a time or a level, so an exception line may join it. */
  currentIsPrefixed: boolean;
  currentChars: number;
  continuationMode: boolean;
  options: SplitOptions;
}

function closeRecord(state: SplitState): void {
  if (state.current) {
    state.records.push(state.current);
  }
  state.current = null;
  state.block = 'none';
  state.currentIsPrefixed = false;
  state.currentChars = 0;
}

function openRecord(state: SplitState, line: string, lineNumber: number): void {
  closeRecord(state);
  state.current = { lineStart: lineNumber, lineEnd: lineNumber, lines: [line] };
  state.currentChars = line.length;
}

function appendToRecord(state: SplitState, line: string, lineNumber: number): void {
  if (!state.current) {
    openRecord(state, line, lineNumber);
    return;
  }
  const tooLong = state.current.lines.length >= state.options.maxLinesPerRecord;
  const tooBig = state.currentChars + line.length > state.options.maxCharsPerRecord;
  if (tooLong || tooBig) {
    // Nothing is dropped: the rest of a huge record becomes a record of its own.
    openRecord(state, line, lineNumber);
    return;
  }
  state.current.lines.push(line);
  state.current.lineEnd = lineNumber;
  state.currentChars += line.length;
}

/** Starts a record for a line that opens a block, and says which block is open. */
function openBlockFor(line: string): OpenBlock {
  if (PYTHON_TRACEBACK_START.test(line)) {
    return 'python-traceback';
  }
  if (WINDOWS_XML_START.test(line) && !WINDOWS_XML_END.test(line)) {
    return 'windows-xml';
  }
  if (WINDOWS_TEXT_START.test(line)) {
    return 'windows-text';
  }
  if (PRETTY_JSON_START.test(line)) {
    return 'json-object';
  }
  if (JAVA_THREAD_EXCEPTION.test(line) || EXCEPTION_HEADLINE.test(line)) {
    return 'stack';
  }
  return 'none';
}

/** True when the line belongs to the block that is open, whatever it looks like. */
function continuesBlock(state: SplitState, line: string): boolean {
  if (state.block === 'windows-xml' || state.block === 'json-object') {
    return true;
  }
  if (state.block === 'windows-text') {
    // The event's fields ("Source:   x", an indented description) belong to it; a line that opens
    // another record, or anything that is not a field, ends it.
    if (WINDOWS_TEXT_START.test(line) || startsRecord(line)) {
      return false;
    }
    return WINDOWS_TEXT_FIELD.test(line) || /^\s/.test(line);
  }
  if (state.block === 'python-traceback') {
    // Frames are indented; the last line of the traceback names the exception and is not.
    return continuesRecord(line) || EXCEPTION_HEADLINE.test(line);
  }
  if (state.block === 'stack') {
    return continuesRecord(line);
  }
  return false;
}

function handleBlankLine(state: SplitState): void {
  if (state.block === 'windows-text') {
    closeRecord(state);
  }
}

function placeLine(state: SplitState, line: string, lineNumber: number): void {
  if (state.current && continuesBlock(state, line)) {
    appendToRecord(state, line, lineNumber);
    const xmlEnded = state.block === 'windows-xml' && WINDOWS_XML_END.test(line);
    const jsonEnded = state.block === 'json-object' && PRETTY_JSON_END.test(line);
    if (xmlEnded || jsonEnded) {
      closeRecord(state);
    }
    return;
  }
  if (startsRecord(line)) {
    openRecord(state, line, lineNumber);
    state.block = openBlockFor(line);
    state.currentIsPrefixed = true;
    return;
  }
  // The exception that a logger prints right after its own line belongs to that line.
  if (
    state.current &&
    state.currentIsPrefixed &&
    state.block === 'none' &&
    openBlockFor(line) !== 'none'
  ) {
    state.block = openBlockFor(line);
    appendToRecord(state, line, lineNumber);
    return;
  }
  // In a timestamped log, a line without a time (an exception headline, a traceback, a message
  // that contains a line break) belongs to the record before it.
  if (state.current && (continuesRecord(line) || state.continuationMode)) {
    appendToRecord(state, line, lineNumber);
    return;
  }
  openRecord(state, line, lineNumber);
  state.block = openBlockFor(line);
}

/** Splits the text of a log into records, keeping every non-empty line and its original number. */
export function splitIntoRecords(
  text: string,
  options: SplitOptions = DEFAULT_SPLIT_OPTIONS,
): RawRecord[] {
  const physicalLines = text.split(/\r?\n/);
  const state: SplitState = {
    records: [],
    current: null,
    block: 'none',
    currentIsPrefixed: false,
    currentChars: 0,
    continuationMode: isMostlyTimestamped(physicalLines),
    options,
  };
  physicalLines.forEach((rawLine, index) => {
    const line = rawLine.trimEnd();
    if (line.trim() === '') {
      handleBlankLine(state);
      return;
    }
    placeLine(state, line, index + 1);
  });
  closeRecord(state);
  return state.records;
}
