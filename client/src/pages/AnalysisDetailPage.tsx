import { Link, useParams } from 'react-router-dom';

import { ErrorNotice } from '../components/ErrorNotice';
import { FeedbackBlock } from '../components/FeedbackBlock';
import { OfflineNotice } from '../components/OfflineNotice';
import { OriginalLog } from '../components/OriginalLog';
import { ReportView } from '../components/ReportView';
import { ShareBlock } from '../components/ShareBlock';
import { DETAIL_TEXT } from '../content/detail';
import { useText } from '../i18n/useText';
import { useLoad } from '../hooks/useLoad';
import { api, type LoadedAnalysis } from '../lib/api';

export function AnalysisDetailPage() {
  const text = useText(DETAIL_TEXT);
  const { id } = useParams();
  const { data: loaded, error } = useLoad(() => api.getAnalysis(id ?? ''), [id], text.loadFallback);

  return (
    <div className="report-page">
      <Link to="/history" className="report-back-link">
        {text.backLink}
      </Link>

      {error && <ErrorNotice title={text.loadFailed} message={error} className="mt-10" />}
      {!loaded && !error && <p className="caret mt-10 text-lg text-chalk">{text.loading}</p>}

      {loaded && <AnalysisDetail loaded={loaded} />}
    </div>
  );
}

function AnalysisDetail({ loaded: { analysis, offline } }: { loaded: LoadedAnalysis }) {
  return (
    <div className="report-page-body">
      {offline && <LocalCopyNotice logTruncated={analysis.logTruncated === true} />}
      <ReportView analysis={analysis} pageTitle>
        {/* Feedback and sharing need the server, so a local copy does not offer them. */}
        {!offline && <FeedbackBlock analysisId={analysis.id} initialHelpful={analysis.helpful} />}
        {!offline && <ShareBlock analysisId={analysis.id} initialToken={analysis.shareToken} />}
      </ReportView>
      <OriginalLog rawLog={analysis.rawLog} />
    </div>
  );
}

function LocalCopyNotice({ logTruncated }: { logTruncated: boolean }) {
  const text = useText(DETAIL_TEXT);
  const lines = [text.offlineNotice, text.offlineLimits];
  if (logTruncated) {
    lines.push(text.logTruncated);
  }
  return <OfflineNotice lines={lines} className="mt-8" />;
}
