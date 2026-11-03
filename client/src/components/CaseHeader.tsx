import { useRef } from 'react';

import { REPORT_TEXT } from '../content/report';
import { useRevealOnView } from '../hooks/useRevealOnView';
import { formatDate } from '../lib/format';
import type { ReportSource } from '../lib/types';
import { SeverityStamp } from './SeverityStamp';

/**
 * The cover of the case file: the typed file line, then an index card taped to the desk
 * with the title on a typed label and the severity stamped across it.
 */
export function CaseHeader({ analysis }: { analysis: ReportSource }) {
  const headerRef = useRef<HTMLElement>(null);
  useRevealOnView(headerRef);

  return (
    <header ref={headerRef} className="report-header">
      <p className="report-file-line evidence-label">
        <span className="report-file-name">{REPORT_TEXT.caseFile}</span>
        <span>{REPORT_TEXT.caseNumber(analysis.id)}</span>
        <span>{analysis.category}</span>
        {analysis.report.format && <span>{analysis.report.format}</span>}
        <time dateTime={analysis.createdAt}>{formatDate(analysis.createdAt)}</time>
      </p>
      <hgroup className="report-cover evidence-card">
        <p className="report-cover-label evidence-label">{REPORT_TEXT.caseTitleLabel}</p>
        <h2 className="report-title">
          <span>{analysis.title}</span>
        </h2>
        <SeverityStamp severity={analysis.severity} />
      </hgroup>
    </header>
  );
}
