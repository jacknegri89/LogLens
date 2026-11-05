import { useCallback, useMemo, useRef } from 'react';

import { WORKBENCH_EXPLORER_TEXT } from '../../../content/workbenchExplorer';
import { useText } from '../../../i18n/useText';
import { findPreviousTimed, formatLineTime } from '../../core/timeFormat';
import { useWorkbench } from '../../core/useWorkbench';
import type { ParsedLine } from '../../types';
import { LineRow } from './LineRow';
import { useListNavigation } from './useListNavigation';
import { useListViewport } from './useListViewport';
import { visibleWindow } from './visibleWindow';

interface LineListProps {
  lines: readonly ParsedLine[];
  /** Positions in `lines` of the rows to show, in order. */
  rows: readonly number[];
  highlights: readonly string[];
}

/** A windowed listbox: only the visible rows (plus a few) are in the DOM, even for 50,000 lines. */
export function LineList({ lines, rows, highlights }: LineListProps) {
  const text = useText(WORKBENCH_EXPLORER_TEXT).explorer;
  const { selectedIndex, select } = useWorkbench();
  const listRef = useRef<HTMLDivElement>(null);
  const viewport = useListViewport(listRef);
  const navigation = useListNavigation({ listRef, lines, rows, selectedIndex, select });
  const visible = visibleWindow(viewport.scrollTop, viewport.height, rows.length);
  const activeShown = navigation.activeRow >= visible.start && navigation.activeRow < visible.end;
  let activeDescendant: string | undefined;
  if (activeShown) {
    activeDescendant = `wbx-line-${lines[rows[navigation.activeRow]].index}`;
  }

  return (
    <div
      ref={listRef}
      className="wbx-list"
      role="listbox"
      tabIndex={0}
      aria-label={text.listLabel}
      aria-activedescendant={activeDescendant}
      onScroll={viewport.onScroll}
      onKeyDown={navigation.onKeyDown}
    >
      <div className="wbx-list-spacer" style={{ height: visible.totalHeight }}>
        <div style={{ transform: `translateY(${visible.offsetTop}px)` }}>
          <VisibleRows {...{ lines, rows, highlights }} range={visible} navigation={navigation} />
        </div>
      </div>
    </div>
  );
}

interface VisibleRowsProps extends LineListProps {
  range: { start: number; end: number };
  navigation: ReturnType<typeof useListNavigation>;
}

function VisibleRows({ lines, rows, highlights, range, navigation }: VisibleRowsProps) {
  const text = useText(WORKBENCH_EXPLORER_TEXT).explorer;
  const { selectedIndex, select, bookmarks, timeMode } = useWorkbench();
  const previousTimed = useMemo(() => findPreviousTimed(lines), [lines]);
  const { setActiveLine } = navigation;
  const choose = useCallback(
    (lineIndex: number) => {
      select(lineIndex);
      setActiveLine(lineIndex);
    },
    [select, setActiveLine],
  );

  return rows.slice(range.start, range.end).map((position, offset) => {
    const line = lines[position];
    let previous: ParsedLine | null = null;
    if (previousTimed[position] !== -1) {
      previous = lines[previousTimed[position]];
    }
    return (
      <LineRow
        key={line.index}
        {...{ line, highlights }}
        row={range.start + offset}
        rowCount={rows.length}
        time={formatLineTime(line, previous, timeMode)}
        selected={line.index === selectedIndex}
        active={range.start + offset === navigation.activeRow}
        bookmarked={bookmarks.has(line.index)}
        bookmarkedLabel={text.bookmarked}
        onChoose={choose}
      />
    );
  });
}
