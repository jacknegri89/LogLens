import type { CSSProperties } from 'react';

import { REPORT_TEXT, SEVERITY_LABEL } from '../content/report';
import type { Severity } from '../lib/types';

/**
 * The big severity stamp of the case file. `--stamp-letters` lets the CSS shrink a long word
 * ("Informativa") so it always fits the card.
 */
export function SeverityStamp({ severity }: { severity: Severity }) {
  const label = SEVERITY_LABEL[severity];
  return (
    <p
      className="report-stamp stamp-land"
      data-severity={severity}
      style={{ '--stamp-letters': label.length } as CSSProperties}
    >
      <span className="report-stamp-kicker">{REPORT_TEXT.severityStamp}</span>
      <span className="report-stamp-word">{label}</span>
    </p>
  );
}
