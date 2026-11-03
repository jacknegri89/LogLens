import { Link } from 'react-router-dom';

import { LOST_PAGE_TEXT } from '../content/errors';

/** Shown for any address that does not match a page: a card whose label was blacked out. */
export function NotFound() {
  return (
    <section className="lost-page">
      <div className="lost-copy">
        <p className="lost-code">{LOST_PAGE_TEXT.code}</p>
        <h1 className="lost-title">
          {LOST_PAGE_TEXT.titleStart} <span className="marker">{LOST_PAGE_TEXT.titleMarked}</span>
        </h1>
        <p className="lost-message">{LOST_PAGE_TEXT.message}</p>
        <LostLinks />
      </div>
      <LostCard />
    </section>
  );
}

function LostLinks() {
  return (
    <div className="lost-links">
      <Link to="/" className="btn-ink px-6 py-3 text-sm font-bold tracking-wide uppercase">
        {LOST_PAGE_TEXT.analyzeLink}
      </Link>
      <Link to="/history" className="lost-history-link">
        {LOST_PAGE_TEXT.historyLink}
      </Link>
    </div>
  );
}

function LostCard() {
  return (
    <div className="lost-card case-paper" aria-hidden="true">
      <span className="case-tab">{LOST_PAGE_TEXT.cardNumber}</span>
      <span className="lost-stamp">{LOST_PAGE_TEXT.stamp}</span>
      <span className="lost-bar lost-bar-long" />
      <span className="lost-bar lost-bar-short" />
    </div>
  );
}
