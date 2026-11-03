import { Link } from 'react-router-dom';

import { SHARE_TEXT } from '../content/share';
import { SHARED_PAGE_TEXT } from '../content/sharedPage';

/** The link does not work: it never existed or its owner stopped sharing it. */
export function SharedUnavailable({ message }: { message: string }) {
  return (
    <section role="alert" className="shared-missing">
      <p className="shared-missing-stamp">{SHARED_PAGE_TEXT.unavailableStamp}</p>
      <h1 className="shared-missing-title">{SHARE_TEXT.unavailableTitle}</h1>
      <p className="shared-missing-message">{message}</p>
      <p className="shared-missing-hint">{SHARED_PAGE_TEXT.unavailableHint}</p>
      <Link
        to="/"
        className="btn-ink mt-6 inline-block px-6 py-3 text-sm font-bold tracking-wide uppercase"
      >
        {SHARED_PAGE_TEXT.analyzeLink}
      </Link>
    </section>
  );
}
