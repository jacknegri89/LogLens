import { SHARED_PAGE_TEXT } from '../content/sharedPage';
import { useText } from '../i18n/useText';

/** A taped slip above the report: the read-only stamp and what the copy leaves out. */
export function SharedBanner() {
  const text = useText(SHARED_PAGE_TEXT);
  return (
    <aside className="shared-banner">
      <p className="shared-stamp">{text.stamp}</p>
      <p className="shared-note">{text.sharedNote}</p>
    </aside>
  );
}
