import { Link } from 'react-router-dom';

import { HISTORY_TEXT } from '../content/history';
import { useText } from '../i18n/useText';

/** An empty drawer with one blank card, and the way to put the first log in it. */
export function EmptyHistory() {
  const text = useText(HISTORY_TEXT);
  return (
    <section className="case-drawer case-empty" aria-labelledby="empty-history-title">
      <div className="case-ghost" aria-hidden="true">
        <span className="case-tab">{text.caseNumber(1)}</span>
        <span className="case-ghost-label">{text.emptyCardLabel}</span>
      </div>
      <div className="case-empty-copy">
        <h2 id="empty-history-title" className="case-empty-title">
          {text.emptyTitle}
        </h2>
        <p className="case-empty-text">{text.empty}</p>
        <Link
          to="/"
          className="btn-ink mt-6 inline-block px-6 py-3 text-sm font-bold tracking-wide uppercase"
        >
          {text.analyzeLink}
        </Link>
      </div>
    </section>
  );
}
