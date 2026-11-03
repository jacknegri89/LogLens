export interface RegexFlagState {
  ignoreCase: boolean;
  global: boolean;
  multiline: boolean;
  dotAll: boolean;
}

export const DEFAULT_FLAGS: RegexFlagState = {
  ignoreCase: true,
  global: true,
  multiline: false,
  dotAll: false,
};

export type RegexBuild =
  | { status: 'empty' }
  | { status: 'invalid'; message: string }
  | { status: 'risky' }
  | { status: 'ready'; regex: RegExp; firstMatchOnly: boolean };

/**
 * A repeated group that holds a repeat, such as `(a+)+` or `(\w+\s?)*`: the shape that can hang
 * a browser. It is a heuristic and also stops a few safe patterns like `(\d+,)+`.
 */
const NESTED_REPEAT = /\((?:[^()\\]|\\.)*[+*](?:[^()\\]|\\.)*\)(?:[+*]|\{\d+,\d*\})/;

export function flagsToText(flags: RegexFlagState): string {
  return (flags.ignoreCase ? 'i' : '') + (flags.multiline ? 'm' : '') + (flags.dotAll ? 's' : '');
}

export function looksCatastrophic(pattern: string): boolean {
  return NESTED_REPEAT.test(pattern);
}

/**
 * Turns what the visitor typed into a regex. It never throws: a bad pattern becomes a status.
 * The regex is always global so one scan can read every match of a line; `firstMatchOnly`
 * carries the visitor's own choice of the `g` flag.
 */
export function buildRegex(pattern: string, flags: RegexFlagState): RegexBuild {
  if (pattern === '') return { status: 'empty' };
  if (looksCatastrophic(pattern)) return { status: 'risky' };
  try {
    const regex = new RegExp(pattern, `g${flagsToText(flags)}`);
    return { status: 'ready', regex, firstMatchOnly: !flags.global };
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : String(failure);
    return { status: 'invalid', message };
  }
}
