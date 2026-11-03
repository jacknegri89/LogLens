import { Link } from 'react-router-dom';

import { ANALYZE_TEXT } from '../content/analyze';
import { useText } from '../i18n/useText';
import type { AnalysisStatus } from '../hooks/useAnalysis';
import type { AnalysisRecord } from '../lib/types';
import { AnalysisProgress } from './AnalysisProgress';
import { ErrorNotice } from './ErrorNotice';
import { ReportView } from './ReportView';

/**
 * The right half of the Analyze page: the case folder beside the sheet. From lg up it
 * is exactly as tall as the sheet and scrolls inside, so the desk never grows uneven.
 */
export function ReviewPanel({
  status,
  error,
  result,
}: {
  status: AnalysisStatus;
  error: string;
  result: AnalysisRecord | null;
}) {
  const text = useText(ANALYZE_TEXT);
  return (
    <section className="case-folder min-w-0 lg:relative" aria-label={text.exhibitReview}>
      <div className="p-6 sm:p-7 lg:absolute lg:inset-0 lg:overflow-y-auto" aria-live="polite">
        <p className="evidence-label text-chalk" aria-hidden="true">
          {text.exhibitReview}
        </p>
        <div className="mt-6">
          {status === 'loading' && <AnalysisProgress />}
          {status === 'error' && <ErrorNotice title={text.failedTitle} message={error} />}
          {status === 'idle' && result && <ResultView analysis={result} />}
          {status === 'idle' && !result && <ReviewEmpty />}
        </div>
      </div>
    </section>
  );
}

function ResultView({ analysis }: { analysis: AnalysisRecord }) {
  const text = useText(ANALYZE_TEXT);
  return (
    <div className="report-reveal">
      <ReportView analysis={analysis} />
      <Link
        to={`/analyses/${analysis.id}`}
        className="mt-8 inline-block font-bold underline decoration-2 underline-offset-4 hover:bg-marker hover:text-ink"
      >
        {text.openFullPage}
      </Link>
    </div>
  );
}

/** Before any analysis: a pinned index card listing what the review will hold. */
function ReviewEmpty() {
  const text = useText(ANALYZE_TEXT);
  const items = text.reviewItems;
  const entries = [
    `${items.failingLines} ${items.failingLinesRest}`,
    items.severity,
    items.causes,
    items.issue,
  ];
  return (
    <div className="evidence-card evidence-card-plain evidence-tilt-right mx-auto mt-4 max-w-md">
      <span className="pin" aria-hidden="true" />
      <h2 className="text-[1.6rem] leading-tight font-black uppercase [font-stretch:125%]">
        {text.reviewTitle}
      </h2>
      <p className="mt-5 font-mono text-[15px] leading-relaxed text-pretty text-ink-soft">
        {text.reviewEmpty}
      </p>
      <ul className="mt-3 space-y-3 font-mono text-[15px] leading-relaxed">
        {entries.map((entry, index) => (
          <li key={entry} className="flex items-start gap-3 py-0.5">
            <span className="evidence-tag mt-1">{text.evidenceTag(index + 1)}</span>
            <span>{entry}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
