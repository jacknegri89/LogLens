import { normaliseLevel } from '../fieldAliases';
import { extractPairs } from '../keyValues';
import type { LogLevel } from '../normalizedEvent';
import { findTimestamp } from '../timestamps';
import type { FormatParser, FormatResult } from './formatTypes';

/**
 * Application logs in a custom shape: a time, a level, perhaps a service, then free text with
 * key=value pairs. It is the format of last resort, so it recognises each part on its own and
 * reports `partial` when only some of the parts are there.
 */

// Wide enough for formats that put the level after a long header (Blue Gene/L: node, time, node, "RAS KERNEL INFO").
const PREFIX_WINDOW = 160;
const LEVEL_NAMES =
  'TRACE|DEBUG|INFO|NOTICE|WARN(?:ING)?|ERROR|ERR|FATAL|CRITICAL|CRIT|ALERT|EMERG|PANIC|SEVERE';
// [ERROR], (WARN), "ERROR:" at the very start of what follows the time.
const LEADING_LEVEL = new RegExp(`^[\\s\\[(|]*(${LEVEL_NAMES})[\\])|]*(?::|\\s|-|$)`, 'i');
// An upper-case level word anywhere in the first part of the line: "svc ERROR connection lost".
const INLINE_LEVEL = new RegExp(`\\b(${LEVEL_NAMES})\\b`);
const CONTAINER_STREAM = /^(?:stdout|stderr) [FP] /;
const THREAD_NAME =
  /^(?:main|pool-\d+-thread-\d+|http-nio-[\w-]+|[\w-]*[Tt]hread[\w-]*|worker-\d+|scheduler-\d+)$/;

interface LevelMatch {
  level: LogLevel;
  /** Where the text after the level word starts, in the text that was searched. */
  end: number;
}

function findLevel(prefix: string): LevelMatch | null {
  const window = prefix.slice(0, PREFIX_WINDOW);
  const leading = LEADING_LEVEL.exec(window);
  if (leading) {
    return { level: normaliseLevel(leading[1]), end: leading[0].length };
  }
  const inline = INLINE_LEVEL.exec(window);
  if (inline) {
    return { level: normaliseLevel(inline[1]), end: inline.index + inline[0].length };
  }
  return null;
}

interface ServiceMatch {
  service: string | null;
  thread: string | null;
  end: number;
}

/** A bracketed or colon-terminated name right after the level: "[payment-service]", "checkout:". */
function findService(afterLevel: string): ServiceMatch {
  const bracket = /^\s*\[([^\]\s]{1,60})\]\s*/.exec(afterLevel);
  if (bracket) {
    if (THREAD_NAME.test(bracket[1])) {
      return { service: null, thread: bracket[1], end: bracket[0].length };
    }
    return { service: bracket[1], thread: null, end: bracket[0].length };
  }
  const named = /^\s*([A-Za-z][\w.-]{1,40}):\s+/.exec(afterLevel);
  if (named) {
    return { service: named[1], thread: null, end: named[0].length };
  }
  return { service: null, thread: null, end: 0 };
}

export const parseGenericLine: FormatParser = (context) => {
  const line = context.firstLine;
  const found = findTimestamp(line, context.timestampOptions);
  let prefix = line;
  if (found && found.start <= 8) {
    prefix = line.slice(found.end).replace(CONTAINER_STREAM, '');
  }
  const levelMatch = findLevel(prefix);
  const pairs = extractPairs(line);
  const hasPairs = Object.keys(pairs).length > 0;
  if (!found && !levelMatch && !hasPairs) {
    return null;
  }
  const result: FormatResult = {
    format: 'generic',
    status: 'partial',
    message: line,
    pairs,
  };
  if (found) {
    result.timestamp = found.timestamp;
  }
  if (levelMatch) {
    result.level = levelMatch.level;
    const afterLevel = prefix.slice(levelMatch.end);
    const service = findService(afterLevel);
    if (service.service) {
      result.service = service.service;
    }
    if (service.thread) {
      result.pairs = { ...pairs, thread: service.thread };
    }
    result.message = afterLevel.slice(service.end).trim() || line;
  }
  if (!levelMatch && found && found.start > 0) {
    // Some tools put the level before the time: "[warn] 2023-10-12 14:27:03: message".
    const beforeTime = LEADING_LEVEL.exec(line.slice(0, found.start));
    if (beforeTime) {
      result.level = normaliseLevel(beforeTime[1]);
      result.message =
        line
          .slice(found.end)
          .replace(/^[:\s-]+/, '')
          .trim() || line;
      result.status = 'parsed';
    }
  }
  if (found && levelMatch) {
    result.status = 'parsed';
  }
  return result;
};
