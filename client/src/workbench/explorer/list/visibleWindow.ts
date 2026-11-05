/** Every row has this height in pixels; the CSS of `.wbx-row` uses the same number. */
export const ROW_HEIGHT = 28;
export const OVERSCAN = 8;
/** Whatever the viewport, the DOM never holds more rows than this. */
export const MAX_RENDERED_ROWS = 60;

export interface VisibleWindow {
  /** First row to render. */
  start: number;
  /** One past the last row to render. */
  end: number;
  /** Pixels above the first rendered row. */
  offsetTop: number;
  totalHeight: number;
}

function finiteOrZero(value: number): number {
  if (Number.isFinite(value) && value > 0) {
    return value;
  }
  return 0;
}

/** The rows a scrolled list must render: the visible ones plus a few above and below. */
export function visibleWindow(
  scrollTop: number,
  viewportHeight: number,
  rowCount: number,
  rowHeight = ROW_HEIGHT,
): VisibleWindow {
  const totalHeight = rowCount * rowHeight;
  const height = finiteOrZero(viewportHeight);
  const top = Math.min(finiteOrZero(scrollTop), Math.max(0, totalHeight - height));
  const first = Math.floor(top / rowHeight);
  const start = Math.max(0, first - OVERSCAN);
  const wanted = Math.ceil(height / rowHeight) + 1 + OVERSCAN * 2;
  const end = Math.min(rowCount, start + Math.min(MAX_RENDERED_ROWS, wanted));
  return { start, end, offsetTop: start * rowHeight, totalHeight };
}

/** The scrollTop that brings a row fully into view, or null when it is visible already. */
export function scrollTopToReveal(
  row: number,
  scrollTop: number,
  viewportHeight: number,
  rowHeight = ROW_HEIGHT,
): number | null {
  const rowTop = row * rowHeight;
  if (rowTop < scrollTop) {
    return rowTop;
  }
  if (rowTop + rowHeight > scrollTop + viewportHeight) {
    return rowTop + rowHeight - viewportHeight;
  }
  return null;
}

const STEP_KEYS: Record<string, number> = { ArrowUp: -1, ArrowDown: 1 };

/** The row a navigation key moves to, or null when the key does not navigate. */
export function nextRow(key: string, current: number, rowCount: number, pageSize: number) {
  if (rowCount === 0) {
    return null;
  }
  const page = Math.max(1, pageSize);
  let pageDown = current + page;
  if (current < 0) {
    pageDown = page - 1;
  }
  const targets: Record<string, number> = {
    Home: 0,
    End: rowCount - 1,
    PageUp: current - page,
    PageDown: pageDown,
  };
  const step = STEP_KEYS[key];
  let target = targets[key];
  if (step !== undefined) {
    target = current + step;
    if (current < 0) {
      target = 0;
    }
  }
  if (target === undefined) {
    return null;
  }
  return Math.min(rowCount - 1, Math.max(0, target));
}

/** The position of `value` in an ascending list read through `valueAt`, or -1. */
function binarySearch(length: number, valueAt: (position: number) => number, value: number) {
  let low = 0;
  let high = length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const found = valueAt(middle);
    if (found === value) {
      return middle;
    }
    if (found < value) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return -1;
}

/** The position of `value` in an ascending array, or -1. */
export function findSorted(sorted: readonly number[], value: number): number {
  return binarySearch(sorted.length, (position) => sorted[position], value);
}

/** The row showing the line whose `index` is `lineIndex`, or -1 when the filter hides it. */
export function rowOfLine(
  lines: readonly { index: number }[],
  rows: readonly number[],
  lineIndex: number,
): number {
  const position = binarySearch(lines.length, (at) => lines[at].index, lineIndex);
  if (position === -1) {
    return -1;
  }
  return findSorted(rows, position);
}
