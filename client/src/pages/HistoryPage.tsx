import { EmptyHistory } from '../components/EmptyHistory';
import { ErrorNotice } from '../components/ErrorNotice';
import { HistoryContent } from '../components/HistoryContent';
import { HistoryHeading } from '../components/HistoryHeading';
import { HistoryLoading } from '../components/HistoryLoading';
import { OfflineNotice } from '../components/OfflineNotice';
import { HISTORY_TEXT } from '../content/history';
import { useClearHistory } from '../hooks/useClearHistory';
import { useHistory } from '../hooks/useHistory';
import { useText } from '../i18n/useText';

export function HistoryPage() {
  const text = useText(HISTORY_TEXT);
  const { items, offline, error, reload, forget } = useHistory(text.loadFallback);
  const clearHistory = useClearHistory(reload);

  return (
    <div>
      <HistoryHeading count={items?.length ?? null} />
      {offline && <OfflineNotice lines={[text.offlineNotice]} className="mt-8" />}
      {error && <ErrorNotice title={text.loadFailed} message={error} className="mt-10" />}
      {items === null && !error && <HistoryLoading />}
      {items && items.length === 0 && <EmptyHistory />}
      {items && items.length > 0 && (
        <HistoryContent
          items={items}
          offline={offline}
          onRemoved={forget}
          clearHistory={clearHistory}
        />
      )}
    </div>
  );
}
