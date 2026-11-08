/**
 * Processing in blocks. A big log is read in blocks of events so the work per block stays small,
 * and each block also sees a few events of its neighbours (the overlap), so a sequence that
 * crosses a boundary (an error and the lines around it) is never cut in two.
 */

export interface Chunk<T> {
  /** Index in the source of the first event that BELONGS to this block. */
  coreStart: number;
  /** Index after the last event that belongs to this block. */
  coreEnd: number;
  /** The block with its overlap: the core plus `overlap` events on each side, when they exist. */
  items: T[];
  /** Index in the source of `items[0]`. */
  start: number;
}

export function splitIntoChunks<T>(items: readonly T[], size: number, overlap: number): Chunk<T>[] {
  if (size < 1) {
    throw new RangeError('The size of a block must be at least 1.');
  }
  const safeOverlap = Math.max(0, overlap);
  const chunks: Chunk<T>[] = [];
  for (let coreStart = 0; coreStart < items.length; coreStart += size) {
    const coreEnd = Math.min(items.length, coreStart + size);
    const start = Math.max(0, coreStart - safeOverlap);
    const end = Math.min(items.length, coreEnd + safeOverlap);
    chunks.push({ coreStart, coreEnd, items: items.slice(start, end), start });
  }
  return chunks;
}
