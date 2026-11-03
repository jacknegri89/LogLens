import { useParams } from 'react-router-dom';

import { ErrorNotice } from '../components/ErrorNotice';
import { ReportView } from '../components/ReportView';
import { SHARE_TEXT } from '../content/share';
import { useLoad } from '../hooks/useLoad';
import { api } from '../lib/api';

/** Public page of a shared report: read-only, with no feedback and no share controls. */
export function SharedReportPage() {
  const { token } = useParams();
  const { data: analysis, error } = useLoad(
    () => api.getShared(token ?? ''),
    [token],
    SHARE_TEXT.unavailableFallback,
  );

  return (
    <div className="max-w-3xl pt-4">
      <p className="border-l-4 border-chalk-dim pl-4 text-chalk">{SHARE_TEXT.sharedNote}</p>
      {error && (
        <ErrorNotice title={SHARE_TEXT.unavailableTitle} message={error} className="mt-10" />
      )}
      {!analysis && !error && (
        <p className="caret mt-10 text-lg text-chalk">{SHARE_TEXT.loading}</p>
      )}
      {analysis && (
        <div className="mt-10">
          <ReportView analysis={analysis} />
        </div>
      )}
    </div>
  );
}
