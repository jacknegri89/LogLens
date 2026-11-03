import { Link } from 'react-router-dom';

import { LOST_PAGE_TEXT } from '../content/errors';
import { useText } from '../i18n/useText';

/** Shown for any address that does not match a page: a card whose label was blacked out. */
export function NotFound() {
  const text = useText(LOST_PAGE_TEXT);
  return (
    <section className="lost-page">
      <div className="lost-copy">
        <p className="lost-code">{text.code}</p>
        <h1 className="lost-title">
          {text.titleStart} <span className="marker">{text.titleMarked}</span>
        </h1>
        <p className="lost-message">{text.message}</p>
        <LostLinks />
      </div>
      <LostCard />
    </section>
  );
}

function LostLinks() {
  const text = useText(LOST_PAGE_TEXT);
  return (
    <div className="lost-links">
      <Link to="/" className="btn-ink px-6 py-3 text-sm font-bold tracking-wide uppercase">
        {text.analyzeLink}
      </Link>
      <Link to="/history" className="lost-history-link">
        {text.historyLink}
      </Link>
    </div>
  );
}

function LostCard() {
  const text = useText(LOST_PAGE_TEXT);
  return (
    <div className="lost-card case-paper" aria-hidden="true">
      <span className="case-tab">{text.cardNumber}</span>
      <span className="lost-stamp">{text.stamp}</span>
      <span className="lost-bar lost-bar-long" />
      <span className="lost-bar lost-bar-short" />
    </div>
  );
}
