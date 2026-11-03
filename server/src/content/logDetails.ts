import { extractLineFieldEntries, type LineField } from '../parser/lineFields';
import { FAILURE_LINE } from './rules';

/**
 * What a rule can quote from the log in its causes (a user name, a column, a stack frame).
 * It is read once, the same way for every language; a field is undefined when the log does not
 * show it, and each language text then uses its own wording for "unknown".
 */
export interface LogDetails {
  postgresUser?: string;
  mysqlUser?: string;
  typeErrorMessage?: string;
  /** The innermost frame of a Python or Java traceback, where the failure really happened. */
  lastFrame?: string;
  nullColumn?: string;
  missingObject?: string;
  exceptionName?: string;
  clientStatus?: string;
  /** The first line of the excerpt that reports a failure. */
  failureLine?: string;
  /** The measurable fields of that line (time, level, address, ...). */
  failureLineFields: LineField[];
}

function findLastFrame(excerpt: string): string | undefined {
  const pythonFrames = [...excerpt.matchAll(/File "([^"]+)", line (\d+), in (\S+)/g)];
  const last = pythonFrames.at(-1);
  if (last) return `${last[1]}, line ${last[2]}, in ${last[3]}`;
  const javaFrames = [...excerpt.matchAll(/^\s*at ([\w$.]+)\(([^)]+)\)/gm)];
  const lastJava = javaFrames.at(-1);
  return lastJava ? `${lastJava[1]} (${lastJava[2]})` : undefined;
}

function findMissingObject(excerpt: string): string | undefined {
  const name = excerpt.match(
    /(?:relation|column|table) ['"]?([^'"\s]+)['"]? (?:does not exist|doesn't exist)|no such (?:table|column): (\S+)/i,
  );
  return name?.[1] ?? name?.[2];
}

function findClientStatus(excerpt: string): string | undefined {
  const code = excerpt.match(/"\s(4\d{2})\s|\bstatus[=:\s]+(4\d{2})\b/i);
  return code?.[1] ?? code?.[2];
}

function findFailureLine(excerpt: string): string | undefined {
  const lines = excerpt.split('\n').filter((line) => line.trim() !== '');
  return lines.find((line) => FAILURE_LINE.test(line));
}

export function extractLogDetails(excerpt: string): LogDetails {
  const failureLine = findFailureLine(excerpt);
  return {
    postgresUser: excerpt.match(/for user "?([^"\s]+)"?/i)?.[1],
    mysqlUser: excerpt.match(/access denied for user '?([^'\s@]+)/i)?.[1],
    typeErrorMessage: excerpt.match(/TypeError: ([^\n]+)/)?.[1]?.trim(),
    lastFrame: findLastFrame(excerpt),
    nullColumn: excerpt.match(/column "([^"]+)"/i)?.[1],
    missingObject: findMissingObject(excerpt),
    exceptionName: excerpt.match(/([\w$]+(?:\.[\w$]+)*(?:Exception|Error)):/)?.[1],
    clientStatus: findClientStatus(excerpt),
    failureLine,
    failureLineFields: failureLine === undefined ? [] : extractLineFieldEntries(failureLine),
  };
}
