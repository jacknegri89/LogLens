import { useParams } from 'react-router-dom';

import { ReportView } from '../components/ReportView';
import { SharedBanner } from '../components/SharedBanner';
import { SharedUnavailable } from '../components/SharedUnavailable';
import { SHARED_PAGE_TEXT } from '../content/sharedPage';
import { useLoad } from '../hooks/useLoad';
import { useText } from '../i18n/useText';
import { api } from '../lib/api';

/** Public page of a shared report: read-only, with no feedback and no share controls. */
export function SharedReportPage() {
  const text = useText(SHARED_PAGE_TEXT);
  const { token } = useParams();
  const { data: analysis, error } = useLoad(
    () => api.getShared(token ?? ''),
    [token],
    text.unavailableFallback,
  );

  if (error) {
    return <SharedUnavailable message={error} />;
  }

  return (
    <div className="max-w-3xl pt-4">
      <SharedBanner />
      {!analysis && (
        <p role="status" className="caret mt-10 text-lg text-chalk">
          {text.loading}
        </p>
      )}
      {analysis && (
        <div className="mt-10">
          <ReportView analysis={analysis} pageTitle />
        </div>
      )}
    </div>
  );
}
