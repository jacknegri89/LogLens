import { useRef } from 'react';

import { REPORT_TEXT } from '../content/report';
import { useText } from '../i18n/useText';
import { useFormatDate } from '../hooks/useFormatDate';
import { useRevealOnView } from '../hooks/useRevealOnView';
import type { ReportSource } from '../lib/types';
import { SeverityStamp } from './SeverityStamp';

/**
 * The cover of the case file: the typed file line, then an index card taped to the desk
 * with the title on a typed label and the severity stamped across it.
 */
export function CaseHeader({
  analysis,
  pageTitle = false,
}: {
  analysis: ReportSource;
  pageTitle?: boolean;
}) {
  const text = useText(REPORT_TEXT);
  const formatDate = useFormatDate();
  const headerRef = useRef<HTMLElement>(null);
  useRevealOnView(headerRef);
  let Heading: 'h1' | 'h2' = 'h2';
  if (pageTitle) {
    Heading = 'h1';
  }

  return (
    <header ref={headerRef} className="report-header">
      <p className="report-file-line evidence-label">
        <span className="report-file-name">{text.caseFile}</span>
        <span>{text.caseNumber(analysis.id)}</span>
        <span>{analysis.category}</span>
        {analysis.report.format && <span>{analysis.report.format}</span>}
        <time dateTime={analysis.createdAt}>{formatDate(analysis.createdAt)}</time>
      </p>
      <hgroup className="report-cover evidence-card">
        <p className="report-cover-label evidence-label">{text.caseTitleLabel}</p>
        <Heading className="report-title">
          <span>{analysis.title}</span>
        </Heading>
        <SeverityStamp severity={analysis.severity} />
      </hgroup>
    </header>
  );
}
