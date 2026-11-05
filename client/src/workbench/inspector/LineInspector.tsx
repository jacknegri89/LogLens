import '../../styles/workbench-inspect.css';

import { useWorkbench } from '../core/useWorkbench';
import { InspectorDrawer } from './InspectorDrawer';
import { findLinePosition } from './linePosition';

/** Opens beside the log when a line is selected, on every Workbench view. */
export function LineInspector() {
  const { lines, selectedIndex, select, bookmarks, toggleBookmark } = useWorkbench();
  let position = -1;
  if (selectedIndex !== null) {
    position = findLinePosition(lines, selectedIndex);
  }
  if (position === -1) {
    return null;
  }
  return (
    <InspectorDrawer
      line={lines[position]}
      lines={lines}
      bookmarks={bookmarks}
      select={select}
      toggleBookmark={toggleBookmark}
    />
  );
}
