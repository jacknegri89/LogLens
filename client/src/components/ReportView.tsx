import type { ReactNode } from 'react';

import { REPORT_TEXT } from '../content/report';
import { findLineNumbers, formatDate } from '../lib/format';
import type { Finding, ReportSource } from '../lib/types';
import { BigPicture } from './BigPicture';
import { FailingLines } from './FailingLines';
import { FindingsList } from './FindingsList';
import { IssueActions } from './IssueActions';
import { ReportSection } from './ReportSection';
import { SeverityBadge } from './SeverityBadge';

interface ReportViewProps {
  analysis: ReportSource;
  children?: ReactNode;
}

/**
 * The review of one analysis. It sits on the dark desk, so the log excerpt is a
 * strip of paper and the failing lines are marked with the highlighter.
 */
export function ReportView({ analysis, children }: ReportViewProps) {
  const { report } = analysis;

  return (
    <article className="space-y-9">
      <ReportHeader analysis={analysis} />
      <BigPictureSection overview={report.overview} />
      <FindingsSection findings={report.findings} />
      <FailingLinesSection analysis={analysis} />
      <ReportSection title={REPORT_TEXT.probableCauses}>
        <CauseList causes={report.causes} />
      </ReportSection>
      <ReportSection title={REPORT_TEXT.debugSteps}>
        <StepList steps={report.debugSteps} />
      </ReportSection>
      <ReportSection title={REPORT_TEXT.githubIssue}>
        <IssueActions id={analysis.id} markdown={report.bugReportMarkdown} />
      </ReportSection>
      {children}
    </article>
  );
}

function FailingLinesSection({ analysis }: { analysis: ReportSource }) {
  const { keyLines } = analysis.report;
  if (keyLines.length === 0) return null;

  const lineNumbers =
    analysis.rawLog === undefined ? undefined : findLineNumbers(analysis.rawLog, keyLines);
  return (
    <ReportSection title={REPORT_TEXT.failingLines}>
      <FailingLines lines={keyLines} lineNumbers={lineNumbers} />
    </ReportSection>
  );
}

function BigPictureSection({ overview }: { overview?: string[] }) {
  if (!overview || overview.length === 0) return null;
  return (
    <ReportSection title={REPORT_TEXT.bigPicture}>
      <BigPicture sentences={overview} />
    </ReportSection>
  );
}

function FindingsSection({ findings }: { findings?: Finding[] }) {
  if (!findings || findings.length < 2) return null;
  return (
    <ReportSection title={REPORT_TEXT.allFindings}>
      <FindingsList findings={findings} />
    </ReportSection>
  );
}

function ReportHeader({ analysis }: { analysis: ReportSource }) {
  return (
    <header>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <SeverityBadge severity={analysis.severity} />
        <span className="font-mono text-sm font-bold text-chalk">{analysis.category}</span>
        {analysis.report.format && (
          <span className="border border-chalk-dim px-1.5 font-mono text-xs text-chalk">
            {analysis.report.format}
          </span>
        )}
        <span className="font-mono text-sm text-chalk-dim">{formatDate(analysis.createdAt)}</span>
      </div>
      <h2 className="mt-5 text-[26px] leading-tight font-extrabold break-words">
        {analysis.title}
      </h2>
    </header>
  );
}

function CauseList({ causes }: { causes: string[] }) {
  return (
    <ul className="space-y-3 text-[17px] leading-relaxed">
      {causes.map((cause, i) => (
        <li key={i} className="flex gap-3">
          <span className="font-extrabold text-marker" aria-hidden="true">
            →
          </span>
          <span>{cause}</span>
        </li>
      ))}
    </ul>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-3 text-[17px] leading-relaxed">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-4">
          <span className="w-6 shrink-0 text-2xl leading-none font-extrabold text-marker [font-stretch:125%]">
            {i + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
