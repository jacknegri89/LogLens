import type { ReactNode } from 'react';

import { REPORT_TEXT } from '../content/report';
import { useText } from '../i18n/useText';
import { findLineNumbers } from '../lib/format';
import { boardEntriesFrom } from '../lib/incidentBoard';
import type { Finding, ReportSource, TimelineEntry } from '../lib/types';
import { BigPicture } from './BigPicture';
import { CaseHeader } from './CaseHeader';
import { EngineNotice } from './EngineNotice';
import { EvidenceBoard } from './EvidenceBoard';
import { FailingLines } from './FailingLines';
import { FindingsList } from './FindingsList';
import { IncidentsSection } from './IncidentsSection';
import { IssueActions } from './IssueActions';
import { CauseList, StepList } from './ProcedureList';
import { ReportSection } from './ReportSection';
import { ToolDrawer } from './ToolDrawer';

interface ReportViewProps {
  analysis: ReportSource;
  /** More tool drawers (feedback, share) placed next to the GitHub issue. */
  children?: ReactNode;
  pageTitle?: boolean;
}

/**
 * The review of one analysis as a case file on the desk: the stamped cover, the case summary,
 * the evidence board with the red thread, the exhibits, the procedure, and the tool drawers.
 */
export function ReportView({ analysis, children, pageTitle = false }: ReportViewProps) {
  const text = useText(REPORT_TEXT);
  const { report } = analysis;
  // Reports with incidents tell the story there; the board is drawn from them, and the earlier
  // summary and findings list (which use the rules' own categories) would only contradict them.
  const incidents = report.incidents ?? [];
  const hasIncidents = incidents.length > 0;
  let boardEntries = report.timeline;
  if (hasIncidents) {
    boardEntries = boardEntriesFrom(incidents);
  }

  return (
    <article className="report-case">
      <CaseHeader analysis={analysis} pageTitle={pageTitle} />
      <EngineNotice
        engine={report.engine}
        coverage={report.coverage}
        validation={report.validation}
        promptInjection={report.promptInjection}
        hasLog={analysis.rawLog !== undefined}
      />
      <IncidentsSection incidents={incidents} hasLog={analysis.rawLog !== undefined} />
      {!hasIncidents && <BigPictureSection overview={report.overview} />}
      <EvidenceBoardSection timeline={boardEntries} />
      {!hasIncidents && <FindingsSection findings={report.findings} />}
      <FailingLinesSection analysis={analysis} />
      <div className="report-procedures">
        <ReportSection title={text.probableCauses}>
          <CauseList causes={report.causes} />
        </ReportSection>
        <ReportSection title={text.debugSteps}>
          <StepList steps={report.debugSteps} />
        </ReportSection>
      </div>
      <div className="report-drawers">
        <ToolDrawer title={text.githubIssue} hint={text.githubIssueHint}>
          <IssueActions id={analysis.id} markdown={report.bugReportMarkdown} />
        </ToolDrawer>
        {children}
      </div>
    </article>
  );
}

function FailingLinesSection({ analysis }: { analysis: ReportSource }) {
  const text = useText(REPORT_TEXT);
  const { keyLines } = analysis.report;
  if (keyLines.length === 0) {
    return null;
  }

  let lineNumbers: ReturnType<typeof findLineNumbers> | undefined;
  if (analysis.rawLog !== undefined) {
    lineNumbers = findLineNumbers(analysis.rawLog, keyLines);
  }
  return (
    <ReportSection title={text.failingLines}>
      <FailingLines lines={keyLines} lineNumbers={lineNumbers} />
    </ReportSection>
  );
}

function BigPictureSection({ overview }: { overview?: string[] }) {
  const text = useText(REPORT_TEXT);
  if (!overview || overview.length === 0) {
    return null;
  }
  return (
    <ReportSection title={text.bigPicture} className="report-section-summary">
      <BigPicture sentences={overview} />
    </ReportSection>
  );
}

function EvidenceBoardSection({ timeline }: { timeline?: TimelineEntry[] }) {
  const text = useText(REPORT_TEXT);
  if (!timeline || timeline.length < 2) {
    return null;
  }
  return (
    <ReportSection title={text.evidenceBoard} hint={text.evidenceBoardHint}>
      <EvidenceBoard entries={timeline} />
    </ReportSection>
  );
}

function FindingsSection({ findings }: { findings?: Finding[] }) {
  const text = useText(REPORT_TEXT);
  if (!findings || findings.length < 2) {
    return null;
  }
  return (
    <ReportSection title={text.allFindings}>
      <FindingsList findings={findings} />
    </ReportSection>
  );
}
