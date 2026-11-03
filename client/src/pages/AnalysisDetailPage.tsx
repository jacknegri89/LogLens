import { Link, useParams } from 'react-router-dom';

import { ErrorNotice } from '../components/ErrorNotice';
import { FeedbackBlock } from '../components/FeedbackBlock';
import { OriginalLog } from '../components/OriginalLog';
import { ReportView } from '../components/ReportView';
import { ShareBlock } from '../components/ShareBlock';
import { DETAIL_TEXT } from '../content/detail';
import { ERROR_TEXT } from '../content/errors';
import { useLoad } from '../hooks/useLoad';
import { api } from '../lib/api';
import type { AnalysisRecord } from '../lib/types';

export function AnalysisDetailPage() {
  const { id } = useParams();
  const { data: analysis, error } = useLoad(
    () => api.getAnalysis(id ?? ''),
    [id],
    ERROR_TEXT.analysisFallback,
  );

  return (
    <div className="report-page">
      <Link to="/history" className="report-back-link">
        {DETAIL_TEXT.backLink}
      </Link>

      {error && <ErrorNotice title={ERROR_TEXT.analysisFailed} message={error} className="mt-10" />}
      {!analysis && !error && (
        <p className="caret mt-10 text-lg text-chalk">{DETAIL_TEXT.loading}</p>
      )}

      {analysis && <AnalysisDetail analysis={analysis} />}
    </div>
  );
}

function AnalysisDetail({ analysis }: { analysis: AnalysisRecord }) {
  return (
    <div className="report-page-body">
      <ReportView analysis={analysis}>
        <FeedbackBlock analysisId={analysis.id} initialHelpful={analysis.helpful} />
        <ShareBlock analysisId={analysis.id} initialToken={analysis.shareToken} />
      </ReportView>
      <OriginalLog rawLog={analysis.rawLog} />
    </div>
  );
}
