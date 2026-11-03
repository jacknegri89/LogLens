import type { CSSProperties } from 'react';

import { REPORT_TEXT } from '../content/report';
import { useText } from '../i18n/useText';
import type { Severity } from '../lib/types';

/**
 * The big severity stamp of the case file. `--stamp-letters` lets the CSS shrink a long word
 * ("Informational") so it always fits the card.
 */
export function SeverityStamp({ severity }: { severity: Severity }) {
  const text = useText(REPORT_TEXT);
  const label = text.severityLabels[severity];
  return (
    <p
      className="report-stamp stamp-land"
      data-severity={severity}
      style={{ '--stamp-letters': label.length } as CSSProperties}
    >
      <span className="report-stamp-kicker">{text.severityStamp}</span>
      <span className="report-stamp-word">{label}</span>
    </p>
  );
}
