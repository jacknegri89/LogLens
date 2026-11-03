import { Link } from 'react-router-dom';

import { SHARED_PAGE_TEXT } from '../content/sharedPage';
import { useText } from '../i18n/useText';

/** The link does not work: it never existed or its owner stopped sharing it. */
export function SharedUnavailable({ message }: { message: string }) {
  const text = useText(SHARED_PAGE_TEXT);
  return (
    <section role="alert" className="shared-missing">
      <p className="shared-missing-stamp">{text.unavailableStamp}</p>
      <h1 className="shared-missing-title">{text.unavailableTitle}</h1>
      <p className="shared-missing-message">{message}</p>
      <p className="shared-missing-hint">{text.unavailableHint}</p>
      <Link
        to="/"
        className="btn-ink mt-6 inline-block px-6 py-3 text-sm font-bold tracking-wide uppercase"
      >
        {text.analyzeLink}
      </Link>
    </section>
  );
}
