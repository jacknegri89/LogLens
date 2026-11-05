import { INSPECTOR_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import type { ParsedLine } from '../types';
import { findLinePosition } from './linePosition';

const MAX_BOOKMARKS = 100;
const PREVIEW_LENGTH = 90;

interface BookmarksListProps {
  lines: readonly ParsedLine[];
  bookmarks: ReadonlySet<number>;
  currentIndex: number;
  onJump: (index: number) => void;
}

interface BookmarkItemProps {
  index: number;
  raw: string;
  current: boolean;
  onJump: (index: number) => void;
}

function BookmarkItem({ index, raw, current, onJump }: BookmarkItemProps) {
  const text = useText(INSPECTOR_TEXT);
  let ariaCurrent: 'true' | undefined;
  if (current) {
    ariaCurrent = 'true';
  }
  return (
    <li>
      <button
        type="button"
        aria-current={ariaCurrent}
        title={text.bookmarkJump(index + 1)}
        onClick={() => onJump(index)}
      >
        <span className="inspect-bookmark-number">{index + 1}</span>
        <span className="inspect-bookmark-text">{raw.slice(0, PREVIEW_LENGTH)}</span>
      </button>
    </li>
  );
}

/** The bookmarked lines in log order; choosing one opens it. */
export function BookmarksList({ lines, bookmarks, currentIndex, onJump }: BookmarksListProps) {
  const text = useText(INSPECTOR_TEXT);
  const sorted = [...bookmarks].sort((first, second) => first - second);
  return (
    <section aria-labelledby="inspector-bookmarks-title">
      <h3 id="inspector-bookmarks-title" className="inspect-heading">
        {text.bookmarksTitle(sorted.length)}
      </h3>
      {sorted.length === 0 && <p className="inspect-muted">{text.bookmarksEmpty}</p>}
      <ul className="inspect-bookmarks">
        {sorted.slice(0, MAX_BOOKMARKS).map((index) => (
          <BookmarkItem
            key={index}
            index={index}
            raw={lines[findLinePosition(lines, index)]?.raw ?? ''}
            current={index === currentIndex}
            onJump={onJump}
          />
        ))}
      </ul>
      {sorted.length > MAX_BOOKMARKS && (
        <p className="inspect-muted">{text.moreBookmarks(sorted.length - MAX_BOOKMARKS)}</p>
      )}
    </section>
  );
}
