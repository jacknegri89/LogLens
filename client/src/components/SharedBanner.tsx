import { SHARE_TEXT } from '../content/share';
import { SHARED_PAGE_TEXT } from '../content/sharedPage';

/** A taped slip above the report: the read-only stamp and what the copy leaves out. */
export function SharedBanner() {
  return (
    <aside className="shared-banner">
      <p className="shared-stamp">{SHARED_PAGE_TEXT.stamp}</p>
      <p className="shared-note">{SHARE_TEXT.sharedNote}</p>
    </aside>
  );
}
