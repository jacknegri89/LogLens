import { Link } from 'react-router-dom';

import { HISTORY_TEXT } from '../content/history';

/** An empty drawer with one blank card, and the way to put the first log in it. */
export function EmptyHistory() {
  return (
    <section className="case-drawer case-empty" aria-labelledby="empty-history-title">
      <div className="case-ghost" aria-hidden="true">
        <span className="case-tab">{HISTORY_TEXT.caseNumber(1)}</span>
        <span className="case-ghost-label">{HISTORY_TEXT.emptyCardLabel}</span>
      </div>
      <div className="case-empty-copy">
        <h2 id="empty-history-title" className="case-empty-title">
          {HISTORY_TEXT.emptyTitle}
        </h2>
        <p className="case-empty-text">{HISTORY_TEXT.empty}</p>
        <Link
          to="/"
          className="btn-ink mt-6 inline-block px-6 py-3 text-sm font-bold tracking-wide uppercase"
        >
          {HISTORY_TEXT.analyzeLink}
        </Link>
      </div>
    </section>
  );
}
