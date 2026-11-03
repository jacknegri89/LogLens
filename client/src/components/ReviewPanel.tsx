import { Link } from 'react-router-dom';

import { ANALYZE_TEXT } from '../content/analyze';
import type { AnalysisStatus } from '../hooks/useAnalysis';
import type { AnalysisRecord } from '../lib/types';
import { AnalysisProgress } from './AnalysisProgress';
import { ErrorNotice } from './ErrorNotice';
import { ReportView } from './ReportView';

/** The right half of the Analyze page: the review, written in red pen. */
export function ReviewPanel({
  status,
  error,
  result,
}: {
  status: AnalysisStatus;
  error: string;
  result: AnalysisRecord | null;
}) {
  return (
    <section
      className="min-w-0 bg-felt-2 p-7 lg:max-h-[40.5rem] lg:overflow-y-auto"
      aria-live="polite"
    >
      {status === 'loading' && <AnalysisProgress />}
      {status === 'error' && <ErrorNotice title={ANALYZE_TEXT.failedTitle} message={error} />}
      {status === 'idle' && result && <ResultView analysis={result} />}
      {status === 'idle' && !result && <ReviewEmpty />}
    </section>
  );
}

function ResultView({ analysis }: { analysis: AnalysisRecord }) {
  return (
    <div className="report-reveal">
      <ReportView analysis={analysis} />
      <Link
        to={`/analyses/${analysis.id}`}
        className="mt-8 inline-block font-bold underline decoration-2 underline-offset-4 hover:bg-marker hover:text-ink"
      >
        {ANALYZE_TEXT.openFullPage}
      </Link>
    </div>
  );
}

function ReviewEmpty() {
  const items = ANALYZE_TEXT.reviewItems;
  return (
    <div>
      <h2 className="text-2xl font-extrabold tracking-tight uppercase [font-stretch:125%]">
        {ANALYZE_TEXT.reviewTitle}
      </h2>
      <p className="mt-3 text-lg text-chalk">{ANALYZE_TEXT.reviewEmpty}</p>
      <ul className="mt-5 space-y-3 text-lg">
        <li>
          <span className="marker">{items.failingLines}</span> {items.failingLinesRest}
        </li>
        <li>{items.severity}</li>
        <li>{items.causes}</li>
        <li>{items.issue}</li>
      </ul>
    </div>
  );
}
