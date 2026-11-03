import { useCallback, useEffect, useState, type KeyboardEvent, type RefObject } from 'react';

import type { ParsedLine } from '../../types';
import { ROW_HEIGHT, nextRow, rowOfLine, scrollTopToReveal } from './visibleWindow';

interface NavigationInput {
  listRef: RefObject<HTMLElement | null>;
  lines: readonly ParsedLine[];
  rows: readonly number[];
  selectedIndex: number | null;
  select: (index: number) => void;
}

function revealRow(element: HTMLElement | null, row: number): void {
  if (!element) return;
  const top = scrollTopToReveal(row, element.scrollTop, element.clientHeight);
  if (top !== null) element.scrollTop = top;
}

/**
 * Keyboard use of the list: arrows, Page Up/Down, Home and End move the active row, Enter or
 * Space selects it. The selected line is scrolled into view whenever it or the filter changes.
 */
export function useListNavigation({
  listRef,
  lines,
  rows,
  selectedIndex,
  select,
}: NavigationInput) {
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const current = activeLine ?? selectedIndex;
  const activeRow = current === null ? -1 : rowOfLine(lines, rows, current);

  useEffect(() => {
    const row = selectedIndex === null ? -1 : rowOfLine(lines, rows, selectedIndex);
    if (row >= 0) revealRow(listRef.current, row);
  }, [listRef, lines, rows, selectedIndex]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const choose = event.key === 'Enter' || event.key === ' ';
      const pageSize = Math.floor((listRef.current?.clientHeight ?? 0) / ROW_HEIGHT) - 1;
      const next = choose ? activeRow : nextRow(event.key, activeRow, rows.length, pageSize);
      if (next === null || next < 0) return;
      event.preventDefault();
      const lineIndex = lines[rows[next]].index;
      if (choose) select(lineIndex);
      setActiveLine(lineIndex);
      revealRow(listRef.current, next);
    },
    [activeRow, lines, rows, listRef, select],
  );

  return { activeRow, setActiveLine, onKeyDown };
}
