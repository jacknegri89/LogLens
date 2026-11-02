import { Link, useParams } from 'react-router-dom';

import { ErrorNotice } from '../components/ErrorNotice';
import { OriginalLog } from '../components/OriginalLog';
import { ReportView } from '../components/ReportView';
import { DETAIL_TEXT } from '../content/detail';
import { ERROR_TEXT } from '../content/errors';
import { useLoad } from '../hooks/useLoad';
import { api } from '../lib/api';

export function AnalysisDetailPage() {
  const { id } = useParams();
  const { data: analysis, error } = useLoad(
    () => api.getAnalysis(id ?? ''),
    [id],
    ERROR_TEXT.analysisFallback,
  );

  return (
    <div className="max-w-3xl pt-4">
      <Link
        to="/history"
        className="font-bold underline decoration-2 underline-offset-4 hover:bg-marker hover:text-ink"
      >
        {DETAIL_TEXT.backLink}
      </Link>

      {error && <ErrorNotice title={ERROR_TEXT.analysisFailed} message={error} className="mt-10" />}
      {!analysis && !error && (
        <p className="caret mt-10 text-lg text-chalk">{DETAIL_TEXT.loading}</p>
      )}

      {analysis && (
        <div className="mt-10 space-y-12">
          <ReportView analysis={analysis} />
          <OriginalLog rawLog={analysis.rawLog} />
        </div>
      )}
    </div>
  );
}
