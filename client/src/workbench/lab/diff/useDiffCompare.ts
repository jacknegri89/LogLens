import { useState } from 'react';

import { parseLines } from '../../core/basicParse';
import { compareLogs, type DiffResult } from './compareLogs';
import type { Slots } from './useDiffSlots';

interface Comparison {
  slots: Slots;
  result: DiffResult;
}

/** Runs the comparison on request, and hides the result as soon as either log changes. */
export function useDiffCompare(slots: Slots) {
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const ready = slots.baseline.text.trim() !== '' && slots.canary.text.trim() !== '';

  function compare() {
    if (!ready) return;
    const result = compareLogs(parseLines(slots.baseline.text), parseLines(slots.canary.text));
    setComparison({ slots, result });
  }

  return { ready, compare, result: comparison?.slots === slots ? comparison.result : null };
}
