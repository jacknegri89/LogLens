import { HISTORY_TEXT } from '../content/history';

/** Shown while the drawer is being opened, so the page does not jump when the cards arrive. */
export function HistoryLoading() {
  return (
    <div className="case-drawer case-drawer-status">
      <p role="status" className="caret case-status">
        {HISTORY_TEXT.loading}
      </p>
    </div>
  );
}
