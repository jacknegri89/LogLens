import type { ParsedLine } from '../types';

/**
 * Where the line with this `index` sits in `lines`, or -1. The array skips blank log lines, so
 * the position and the index differ; `lines` is sorted by index, which allows a binary search.
 */
export function findLinePosition(lines: readonly ParsedLine[], index: number): number {
  let low = 0;
  let high = lines.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const found = lines[middle].index;
    if (found === index) return middle;
    if (found < index) low = middle + 1;
    else high = middle - 1;
  }
  return -1;
}

/** The line next to the given one, `step` places away, or null at the ends of the log. */
export function neighbourLine(
  lines: readonly ParsedLine[],
  index: number,
  step: -1 | 1,
): ParsedLine | null {
  const position = findLinePosition(lines, index);
  return position === -1 ? null : (lines[position + step] ?? null);
}
