import { Link } from 'react-router-dom';

import { HISTORY_TEXT } from '../content/history';

export function EmptyHistory() {
  return (
    <div className="mt-10 bg-paper p-8 text-ink">
      <p className="text-lg">{HISTORY_TEXT.empty}</p>
      <Link
        to="/"
        className="btn-ink mt-6 inline-block px-6 py-2.5 text-sm font-bold tracking-wide uppercase"
      >
        {HISTORY_TEXT.analyzeLink}
      </Link>
    </div>
  );
}
