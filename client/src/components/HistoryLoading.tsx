import { HISTORY_TEXT } from '../content/history';
import { useText } from '../i18n/useText';

/** Shown while the drawer is being opened, so the page does not jump when the cards arrive. */
export function HistoryLoading() {
  const text = useText(HISTORY_TEXT);
  return (
    <div className="case-drawer case-drawer-status">
      <p role="status" className="caret case-status">
        {text.loading}
      </p>
    </div>
  );
}
