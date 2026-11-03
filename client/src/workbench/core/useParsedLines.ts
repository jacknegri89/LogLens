import { useEffect, useMemo, useState } from 'react';

import type { ParsedLine } from '../types';
import { isSmallLog, parseInBackground } from './backgroundParse';
import { parseLines } from './basicParse';

interface ParsedLog {
  source: string;
  lines: ParsedLine[];
}

export interface ParsedLinesState {
  lines: ParsedLine[];
  /** True while a long log is still being read in the background. */
  parsing: boolean;
}

const NOTHING: ParsedLog = { source: '', lines: [] };
const NO_LINES: ParsedLine[] = [];

function pickLines(rawLog: string, small: ParsedLine[] | null, background: ParsedLog) {
  if (small) return { lines: small, parsing: false };
  if (background.source === rawLog) return { lines: background.lines, parsing: false };
  // Live tail only appends: the lines read so far stay valid while the longer text parses.
  const stillValid = rawLog.startsWith(background.source) ? background.lines : NO_LINES;
  return { lines: stillValid, parsing: true };
}

/** The parsed lines of the log: at once for short logs, in a Web Worker for long ones. */
export function useParsedLines(rawLog: string): ParsedLinesState {
  const small = useMemo(() => (isSmallLog(rawLog) ? parseLines(rawLog) : null), [rawLog]);
  const [background, setBackground] = useState<ParsedLog>(NOTHING);

  useEffect(() => {
    if (small) return undefined;
    return parseInBackground(rawLog, (lines) => setBackground({ source: rawLog, lines }));
  }, [small, rawLog]);

  return useMemo(() => pickLines(rawLog, small, background), [rawLog, small, background]);
}
