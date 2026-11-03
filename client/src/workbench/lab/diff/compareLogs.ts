import type { ParsedLine } from '../../types';
import { signatureOf } from './signature';

export interface SignatureEntry {
  signature: string;
  count: number;
  faultCount: number;
  /** The first raw line seen with this signature. */
  sample: string;
}

export interface LogSummary {
  lineCount: number;
  faultCount: number;
  signatureCount: number;
}

export interface SignatureChange {
  signature: string;
  baselineCount: number;
  canaryCount: number;
  isFault: boolean;
  sample: string;
}

export interface SignatureShift extends SignatureChange {
  direction: 'up' | 'down';
}

export interface DiffResult {
  baseline: LogSummary;
  canary: LogSummary;
  /** In the canary only. */
  added: SignatureChange[];
  /** In the baseline only. */
  removed: SignatureChange[];
  /** In both, but at least SHIFT_RATIO times more or less frequent in the canary. */
  shifted: SignatureShift[];
}

export const SHIFT_RATIO = 3;
/** Below this many occurrences a 3x change is noise, such as one line becoming three. */
const MIN_SHIFT_COUNT = 3;

export function buildSignatureTable(lines: readonly ParsedLine[]): Map<string, SignatureEntry> {
  const table = new Map<string, SignatureEntry>();
  for (const line of lines) {
    const signature = signatureOf(line);
    const entry = table.get(signature) ?? { signature, count: 0, faultCount: 0, sample: line.raw };
    entry.count += 1;
    if (line.isFault) entry.faultCount += 1;
    table.set(signature, entry);
  }
  return table;
}

function summarize(lines: readonly ParsedLine[], table: Map<string, SignatureEntry>): LogSummary {
  return {
    lineCount: lines.length,
    faultCount: lines.filter((line) => line.isFault).length,
    signatureCount: table.size,
  };
}

function change(
  entry: SignatureEntry,
  baselineCount: number,
  canaryCount: number,
): SignatureChange {
  return {
    signature: entry.signature,
    baselineCount,
    canaryCount,
    isFault: entry.faultCount > 0,
    sample: entry.sample,
  };
}

/** Faults first, then the most frequent, then alphabetical so the order is stable. */
function byImportance(first: SignatureChange, second: SignatureChange): number {
  const firstCount = Math.max(first.baselineCount, first.canaryCount);
  const secondCount = Math.max(second.baselineCount, second.canaryCount);
  return (
    Number(second.isFault) - Number(first.isFault) ||
    secondCount - firstCount ||
    first.signature.localeCompare(second.signature)
  );
}

function isBigShift(baselineCount: number, canaryCount: number): boolean {
  const larger = Math.max(baselineCount, canaryCount);
  const smaller = Math.min(baselineCount, canaryCount);
  return larger >= MIN_SHIFT_COUNT && larger >= smaller * SHIFT_RATIO;
}

function findShifts(
  baseline: Map<string, SignatureEntry>,
  canary: Map<string, SignatureEntry>,
): SignatureShift[] {
  const shifts: SignatureShift[] = [];
  for (const [signature, canaryEntry] of canary) {
    const baselineEntry = baseline.get(signature);
    if (!baselineEntry || !isBigShift(baselineEntry.count, canaryEntry.count)) continue;
    const direction = canaryEntry.count > baselineEntry.count ? 'up' : 'down';
    shifts.push({ ...change(canaryEntry, baselineEntry.count, canaryEntry.count), direction });
  }
  return shifts.sort(byImportance);
}

function onlyIn(
  source: Map<string, SignatureEntry>,
  other: Map<string, SignatureEntry>,
  fromCanary: boolean,
): SignatureChange[] {
  const changes: SignatureChange[] = [];
  for (const [signature, entry] of source) {
    if (other.has(signature)) continue;
    changes.push(fromCanary ? change(entry, 0, entry.count) : change(entry, entry.count, 0));
  }
  return changes.sort(byImportance);
}

/** What the canary log does that the baseline does not, by message shape and not by exact text. */
export function compareLogs(
  baselineLines: readonly ParsedLine[],
  canaryLines: readonly ParsedLine[],
): DiffResult {
  const baseline = buildSignatureTable(baselineLines);
  const canary = buildSignatureTable(canaryLines);
  return {
    baseline: summarize(baselineLines, baseline),
    canary: summarize(canaryLines, canary),
    added: onlyIn(canary, baseline, true),
    removed: onlyIn(baseline, canary, false),
    shifted: findShifts(baseline, canary),
  };
}

export function hasDifferences(result: DiffResult): boolean {
  return result.added.length + result.removed.length + result.shifted.length > 0;
}

/** The new signatures as plain text for a ticket or a chat: count, kind and template per line. */
export function formatNewSignatures(result: DiffResult): string {
  return result.added
    .map((item) => `${item.canaryCount}x ${item.isFault ? '[fault]' : '[info]'} ${item.signature}`)
    .join('\n');
}
