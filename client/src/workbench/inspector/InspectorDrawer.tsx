import { useRef } from 'react';

import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import type { ParsedLine } from '../types';
import { InspectorBody } from './InspectorBody';
import { InspectorHeader } from './InspectorHeader';
import { useDrawerFocus } from './useDrawerFocus';
import { useInspectorKeys } from './useInspectorKeys';
import { useLineNavigation } from './useLineNavigation';

interface InspectorDrawerProps {
  line: ParsedLine;
  lines: readonly ParsedLine[];
  bookmarks: ReadonlySet<number>;
  select: (index: number | null) => void;
  toggleBookmark: (index: number) => void;
}

/** The side panel (a bottom sheet on a phone) that reads one line closely. It is not modal. */
export function InspectorDrawer(props: InspectorDrawerProps) {
  const { line, lines, bookmarks, select, toggleBookmark } = props;
  const text = useText(INSPECTOR_TEXT);
  const drawerRef = useRef<HTMLElement>(null);
  const navigation = useLineNavigation(lines, line.index, select);
  useDrawerFocus(drawerRef, line.index);
  useInspectorKeys(drawerRef, navigation.actions);

  return (
    <aside
      ref={drawerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="false"
      aria-label={text.dialogLabel(line.index + 1)}
      className="inspect-drawer"
    >
      <InspectorHeader
        lineNumber={line.index + 1}
        bookmarked={bookmarks.has(line.index)}
        navigation={navigation}
        onToggleBookmark={() => toggleBookmark(line.index)}
      />
      <InspectorBody
        key={line.index}
        line={line}
        lines={lines}
        bookmarks={bookmarks}
        onJump={select}
      />
    </aside>
  );
}
