import type { ParsedLine } from '../../types';
import type { MatchRange } from './segments';

export interface ScanOptions {
  maxMatches: number;
  maxPreviewLines: number;
  /** Only the start of a very long line is searched, so one huge line cannot stall a slice. */
  maxLineLength: number;
}

export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
  maxMatches: 5000,
  maxPreviewLines: 300,
  maxLineLength: 4000,
};

export interface LinePreview {
  lineIndex: number;
  raw: string;
  ranges: MatchRange[];
}

export interface ValueCount {
  value: string;
  count: number;
}

/** What the screen needs to know about a scan, at any moment of it. */
export interface ScanSnapshot {
  scannedLines: number;
  totalLines: number;
  matchCount: number;
  matchedLineCount: number;
  previews: LinePreview[];
  values: ValueCount[];
  /** Every distinct match with its count, not only the listed ones. */
  valueCounts: ReadonlyMap<string, number>;
  /** The match cap was reached before the end of the log. */
  stoppedEarly: boolean;
  done: boolean;
}

export interface Scan {
  lines: readonly ParsedLine[];
  regex: RegExp;
  firstMatchOnly: boolean;
  options: ScanOptions;
  nextLine: number;
  matchCount: number;
  matchedLineCount: number;
  previews: LinePreview[];
  valueCounts: Map<string, number>;
  stoppedEarly: boolean;
}

export function createScan(
  lines: readonly ParsedLine[],
  regex: RegExp,
  firstMatchOnly: boolean,
  options: ScanOptions = DEFAULT_SCAN_OPTIONS,
): Scan {
  return {
    lines,
    regex,
    firstMatchOnly,
    options,
    nextLine: 0,
    matchCount: 0,
    matchedLineCount: 0,
    previews: [],
    valueCounts: new Map(),
    stoppedEarly: false,
  };
}

export function isScanDone(scan: Scan): boolean {
  return scan.stoppedEarly || scan.nextLine >= scan.lines.length;
}

/** Every non-empty match in the text. An empty match is skipped, and the search still moves on. */
export function findRanges(
  text: string,
  regex: RegExp,
  firstMatchOnly: boolean,
  limit: number,
): MatchRange[] {
  const ranges: MatchRange[] = [];
  regex.lastIndex = 0;
  let match = regex.exec(text);
  while (match && ranges.length < limit) {
    if (match[0] === '') {
      regex.lastIndex += 1;
    } else {
      ranges.push({ start: match.index, end: match.index + match[0].length });
      if (firstMatchOnly) break;
    }
    match = regex.exec(text);
  }
  return ranges;
}

function recordLine(scan: Scan, line: ParsedLine, ranges: MatchRange[]): void {
  const searched = line.raw.slice(0, scan.options.maxLineLength);
  scan.matchedLineCount += 1;
  scan.matchCount += ranges.length;
  for (const range of ranges) {
    const value = searched.slice(range.start, range.end);
    scan.valueCounts.set(value, (scan.valueCounts.get(value) ?? 0) + 1);
  }
  if (scan.previews.length < scan.options.maxPreviewLines) {
    scan.previews.push({ lineIndex: line.index, raw: searched, ranges });
  }
}

function scanOneLine(scan: Scan, line: ParsedLine): void {
  const searched = line.raw.slice(0, scan.options.maxLineLength);
  const room = scan.options.maxMatches - scan.matchCount;
  const ranges = findRanges(searched, scan.regex, scan.firstMatchOnly, room);
  if (ranges.length > 0) recordLine(scan, line, ranges);
  if (scan.matchCount >= scan.options.maxMatches) scan.stoppedEarly = true;
}

/**
 * Scans lines until the time budget is spent, then returns so the page can breathe.
 * The clock is a parameter to keep tests deterministic.
 */
export function advanceScan(
  scan: Scan,
  budgetMs: number,
  now: () => number = performance.now.bind(performance),
): void {
  const startedAt = now();
  while (!isScanDone(scan) && now() - startedAt < budgetMs) {
    scanOneLine(scan, scan.lines[scan.nextLine]);
    scan.nextLine += 1;
  }
  if (scan.stoppedEarly && scan.nextLine >= scan.lines.length) scan.stoppedEarly = false;
}

const MAX_LISTED_VALUES = 100;

export function readScan(scan: Scan): ScanSnapshot {
  const values = [...scan.valueCounts]
    .map(([value, count]) => ({ value, count }))
    .sort((first, second) => second.count - first.count || first.value.localeCompare(second.value))
    .slice(0, MAX_LISTED_VALUES);
  return {
    scannedLines: scan.nextLine,
    totalLines: scan.lines.length,
    matchCount: scan.matchCount,
    matchedLineCount: scan.matchedLineCount,
    previews: scan.previews,
    values,
    valueCounts: scan.valueCounts,
    stoppedEarly: scan.stoppedEarly,
    done: isScanDone(scan),
  };
}
