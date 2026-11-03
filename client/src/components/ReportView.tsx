import type { ReactNode } from 'react';

import { REPORT_TEXT } from '../content/report';
import { findLineNumbers } from '../lib/format';
import type { Finding, ReportSource, TimelineEntry } from '../lib/types';
import { BigPicture } from './BigPicture';
import { CaseHeader } from './CaseHeader';
import { EvidenceBoard } from './EvidenceBoard';
import { FailingLines } from './FailingLines';
import { FindingsList } from './FindingsList';
import { IssueActions } from './IssueActions';
import { CauseList, StepList } from './ProcedureList';
import { ReportSection } from './ReportSection';
import { ToolDrawer } from './ToolDrawer';

interface ReportViewProps {
  analysis: ReportSource;
  /** More tool drawers (feedback, share) placed next to the GitHub issue. */
  children?: ReactNode;
}

/**
 * The review of one analysis as a case file on the desk: the stamped cover, the case summary,
 * the evidence board with the red thread, the exhibits, the procedure, and the tool drawers.
 */
export function ReportView({ analysis, children }: ReportViewProps) {
  const { report } = analysis;

  return (
    <article className="report-case">
      <CaseHeader analysis={analysis} />
      <BigPictureSection overview={report.overview} />
      <EvidenceBoardSection timeline={report.timeline} />
      <FindingsSection findings={report.findings} />
      <FailingLinesSection analysis={analysis} />
      <div className="report-procedures">
        <ReportSection title={REPORT_TEXT.probableCauses}>
          <CauseList causes={report.causes} />
        </ReportSection>
        <ReportSection title={REPORT_TEXT.debugSteps}>
          <StepList steps={report.debugSteps} />
        </ReportSection>
      </div>
      <div className="report-drawers">
        <ToolDrawer title={REPORT_TEXT.githubIssue} hint={REPORT_TEXT.githubIssueHint}>
          <IssueActions id={analysis.id} markdown={report.bugReportMarkdown} />
        </ToolDrawer>
        {children}
      </div>
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
    <ReportSection title={REPORT_TEXT.bigPicture} className="report-section-summary">
      <BigPicture sentences={overview} />
    </ReportSection>
  );
}

function EvidenceBoardSection({ timeline }: { timeline?: TimelineEntry[] }) {
  if (!timeline || timeline.length < 2) return null;
  return (
    <ReportSection title={REPORT_TEXT.evidenceBoard} hint={REPORT_TEXT.evidenceBoardHint}>
      <EvidenceBoard entries={timeline} />
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
