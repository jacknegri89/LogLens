import { useState } from 'react';

import { EmptyHistory } from '../components/EmptyHistory';
import { ErrorNotice } from '../components/ErrorNotice';
import { HistoryContent } from '../components/HistoryContent';
import { HistoryHeading } from '../components/HistoryHeading';
import { HistoryLoading } from '../components/HistoryLoading';
import { HISTORY_TEXT } from '../content/history';
import { useClearHistory } from '../hooks/useClearHistory';
import { useLoad } from '../hooks/useLoad';
import { useText } from '../i18n/useText';
import { api } from '../lib/api';

export function HistoryPage() {
  const text = useText(HISTORY_TEXT);
  // Bumping this key loads the history again, for example after it was cleared.
  const [reloadKey, setReloadKey] = useState(0);
  const { data: items, error } = useLoad(() => api.listAnalyses(), [reloadKey], text.loadFallback);
  const clearHistory = useClearHistory(() => setReloadKey((key) => key + 1));

  return (
    <div>
      <HistoryHeading count={items?.length ?? null} />
      {error && <ErrorNotice title={text.loadFailed} message={error} className="mt-10" />}
      {items === null && !error && <HistoryLoading />}
      {items && items.length === 0 && <EmptyHistory />}
      {items && items.length > 0 && <HistoryContent items={items} clearHistory={clearHistory} />}
    </div>
  );
}
