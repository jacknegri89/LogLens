import { normaliseLevel } from '../fieldAliases';
import type { LogLevel } from '../normalizedEvent';
import { findTimestamp } from '../timestamps';
import type { FormatParser, FormatResult } from './formatTypes';

/** System and database formats: syslog, Kubernetes (klog), PostgreSQL and MySQL. */

const SYSLOG_SEVERITIES: LogLevel[] = [
  'fatal',
  'fatal',
  'fatal',
  'error',
  'warn',
  'info',
  'info',
  'debug',
];

/** The level a syslog priority number carries: its severity is the number modulo 8. */
function levelFromPriority(priority: number): LogLevel {
  return SYSLOG_SEVERITIES[priority % 8] ?? 'unknown';
}

// <165>1 2026-11-03T14:02:00.003Z host app 1234 ID47 [sd] message
const SYSLOG_5424 =
  /^<(\d{1,3})>(\d) (\S+) (\S+) (\S+) (\S+) (\S+) (?:-|(?:\[[^\]]{0,500}\])+)? ?(.*)$/s;
// <34>Nov  3 14:02:00 host sshd[812]: Failed password for root from 10.0.0.5
const SYSLOG_3164 =
  /^(?:<(\d{1,3})>)?([A-Z][a-z]{2}\s{1,2}\d{1,2} \d{2}:\d{2}:\d{2}) (\S+) ([\w./@-]{1,60})(?:\[(\d+)\])?: ?(.*)$/s;

function nilToUndefined(value: string): string | undefined {
  if (value === '-') {
    return undefined;
  }
  return value;
}

function parseSyslog5424(context: Parameters<FormatParser>[0]): FormatResult | null {
  const match = SYSLOG_5424.exec(context.firstLine);
  if (!match) {
    return null;
  }
  const [, priority, , time, host, app, processId, messageId, message] = match;
  const result: FormatResult = {
    format: 'syslog',
    status: 'parsed',
    level: levelFromPriority(Number(priority)),
    message,
    pairs: { facility: Math.floor(Number(priority) / 8) },
  };
  const found = findTimestamp(time, context.timestampOptions);
  if (found) {
    result.timestamp = found.timestamp;
  }
  const hostName = nilToUndefined(host);
  if (hostName) {
    result.host = hostName;
  }
  const appName = nilToUndefined(app);
  if (appName) {
    result.service = appName;
  }
  const extra = result.pairs ?? {};
  if (nilToUndefined(processId)) {
    extra.pid = processId;
  }
  if (nilToUndefined(messageId)) {
    extra.msgid = messageId;
  }
  result.pairs = extra;
  return result;
}

function parseSyslog3164(context: Parameters<FormatParser>[0]): FormatResult | null {
  const match = SYSLOG_3164.exec(context.firstLine);
  if (!match) {
    return null;
  }
  const [, priority, time, host, program, processId, message] = match;
  const result: FormatResult = {
    format: 'syslog',
    status: 'parsed',
    host,
    service: program,
    message,
    pairs: {},
  };
  const found = findTimestamp(time, context.timestampOptions);
  if (found) {
    result.timestamp = found.timestamp;
  }
  if (priority !== undefined) {
    result.level = levelFromPriority(Number(priority));
  }
  if (processId !== undefined) {
    result.pairs = { pid: Number(processId) };
  }
  return result;
}

/** Syslog in both of its forms: RFC 5424 (versioned, ISO time) and RFC 3164 (the classic one). */
export const parseSyslog: FormatParser = (context) => {
  return parseSyslog5424(context) ?? parseSyslog3164(context);
};

// E1103 14:02:00.123456       1 reflector.go:138] message
const KLOG =
  /^([EWIF])(\d{2})(\d{2}) (\d{2}:\d{2}:\d{2})(?:\.\d+)?\s+(\d+) ([\w./-]+:\d+)\] (.*)$/s;
const KLOG_LEVELS: Record<string, LogLevel> = { E: 'error', W: 'warn', I: 'info', F: 'fatal' };

/** Kubernetes component logs (klog): a level letter, the month and day, the time, the source file. */
export const parseKlog: FormatParser = (context) => {
  const match = KLOG.exec(context.firstLine);
  if (!match) {
    return null;
  }
  const [, letter, month, day, clock, threadId, source, message] = match;
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const monthName = monthNames[Number(month) - 1];
  const result: FormatResult = {
    format: 'klog',
    status: 'parsed',
    level: KLOG_LEVELS[letter] ?? 'unknown',
    message,
    pairs: { thread: Number(threadId), source },
  };
  if (monthName !== undefined) {
    const found = findTimestamp(`${monthName} ${Number(day)} ${clock}`, context.timestampOptions);
    if (found) {
      result.timestamp = found.timestamp;
    }
  }
  return result;
};

// 2026-11-03 14:02:00.123 UTC [1234] app@shop ERROR:  message   (the user@db part is optional)
const POSTGRES =
  /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?(?: [A-Z]{2,5})?) \[(\d+)\](?: ([\w.-]+)@([\w.-]+))? ?(LOG|ERROR|FATAL|PANIC|WARNING|NOTICE|INFO|DEBUG\d?):\s+(.*)$/s;

/** PostgreSQL server log: the pid, the optional user and database, then the level and the message. */
export const parsePostgres: FormatParser = (context) => {
  const match = POSTGRES.exec(context.firstLine);
  if (!match) {
    return null;
  }
  const [, time, processId, user, database, levelWord, message] = match;
  const result: FormatResult = {
    format: 'postgres',
    status: 'parsed',
    service: 'postgres',
    level: normaliseLevel(levelWord.replace(/\d$/, '')),
    message: restOfRecord(context.text, message),
    pairs: { pid: Number(processId) },
  };
  const found = findTimestamp(time, context.timestampOptions);
  if (found) {
    result.timestamp = found.timestamp;
  }
  if (user !== undefined && database !== undefined) {
    result.pairs = { pid: Number(processId), dbUser: user, database };
  }
  return result;
};

/** The message of a multi-line record: its first line's message plus the lines that follow it. */
function restOfRecord(text: string, firstLineMessage: string): string {
  const newline = text.indexOf('\n');
  if (newline === -1) {
    return firstLineMessage;
  }
  return `${firstLineMessage}${text.slice(newline)}`;
}

// 2026-11-03T14:02:00.123456Z 12 [Warning] [MY-010055] [Server] message
const MYSQL =
  /^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?) (\d+) \[(Note|Warning|Error|System|ERROR|Warning|Info)\] (?:\[(MY-\d+)\] \[(\w+)\] )?(.*)$/s;

/** MySQL server log, with the newer error codes (`MY-010055`) when they are there. */
export const parseMysql: FormatParser = (context) => {
  const match = MYSQL.exec(context.firstLine);
  if (!match) {
    return null;
  }
  const [, time, threadId, levelWord, code, subsystem, message] = match;
  const result: FormatResult = {
    format: 'mysql',
    status: 'parsed',
    service: 'mysql',
    level: normaliseLevel(levelWord.replace('Note', 'info').replace('System', 'info')),
    message,
    pairs: { thread: Number(threadId) },
  };
  const found = findTimestamp(time, context.timestampOptions);
  if (found) {
    result.timestamp = found.timestamp;
  }
  const extra = result.pairs ?? {};
  if (code !== undefined) {
    extra.errorCode = code;
  }
  if (subsystem !== undefined) {
    extra.subsystem = subsystem;
  }
  result.pairs = extra;
  return result;
};

// 11-04 10:00:03.456  1234  1250 E AndroidRuntime: FATAL EXCEPTION: main
const LOGCAT =
  /^(\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+) ([VDIWEFA]) ([^\s:]{1,60})\s*: ?(.*)$/s;

const LOGCAT_LEVELS: Record<string, LogLevel> = {
  V: 'trace',
  D: 'debug',
  I: 'info',
  W: 'warn',
  E: 'error',
  F: 'fatal',
  A: 'fatal',
};

/** Android logcat: time, process id, thread id, a one-letter level, the tag and the message. */
export const parseLogcat: FormatParser = (context) => {
  const match = LOGCAT.exec(context.firstLine);
  if (!match) {
    return null;
  }
  const [, , pid, , levelLetter, tag, message] = match;
  const result: FormatResult = {
    format: 'logcat',
    status: 'parsed',
    level: LOGCAT_LEVELS[levelLetter] ?? 'unknown',
    service: tag,
    message,
    pairs: { pid: Number(pid) },
  };
  const found = findTimestamp(context.firstLine, context.timestampOptions);
  if (found) {
    result.timestamp = found.timestamp;
  }
  return result;
};
