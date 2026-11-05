import type { DecodedToken } from './types';

const EPOCH_SHAPE = /(?<![\w.-])(\d{10}|\d{13})(?:\.\d{1,9})?(?![\w])/g;
const MIN_SECONDS = 946_684_800; // 2000-01-01
const MAX_SECONDS = 4_102_444_800; // 2100-01-01

/** Epoch milliseconds for digits that are a plausible 2000-2100 timestamp, or null. */
export function epochToMilliseconds(
  digits: string,
): { milliseconds: number; unit: 'seconds' | 'milliseconds' } | null {
  if (digits.length !== 10 && digits.length !== 13) {
    return null;
  }
  const value = Number(digits);
  let unit: 'seconds' | 'milliseconds' = 'seconds';
  let seconds = value;
  let milliseconds = value * 1000;
  if (digits.length === 13) {
    unit = 'milliseconds';
    seconds = value / 1000;
    milliseconds = value;
  }
  if (seconds < MIN_SECONDS || seconds > MAX_SECONDS) {
    return null;
  }
  return { milliseconds, unit };
}

export function findEpochs(text: string): DecodedToken[] {
  const found: DecodedToken[] = [];
  for (const match of text.matchAll(EPOCH_SHAPE)) {
    const epoch = epochToMilliseconds(match[1]);
    if (!epoch) {
      continue;
    }
    const start = match.index;
    found.push({
      id: `epoch-${start}`,
      kind: 'epoch',
      start,
      end: start + match[0].length,
      source: match[0],
      details: { kind: 'epoch', unit: epoch.unit, epochMilliseconds: epoch.milliseconds },
    });
  }
  return found;
}

export type AgeUnit = 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year';

const UNIT_STEPS: ReadonlyArray<[AgeUnit, number]> = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** How far `epochMilliseconds` is from `nowMilliseconds`, in the largest whole unit. */
export function describeAge(
  epochMilliseconds: number,
  nowMilliseconds: number,
): { amount: number; unit: AgeUnit; inFuture: boolean } {
  const difference = nowMilliseconds - epochMilliseconds;
  const distance = Math.abs(difference);
  const step = UNIT_STEPS.find(([, size]) => distance >= size);
  let amount = Math.floor(distance / 1000);
  let unit: AgeUnit = 'second';
  if (step) {
    amount = Math.floor(distance / step[1]);
    unit = step[0];
  }
  return {
    amount,
    unit,
    inFuture: difference < 0,
  };
}
