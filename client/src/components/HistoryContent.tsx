import { ClearHistory } from './ClearHistory';
import { ErrorNotice } from './ErrorNotice';
import { HistoryList } from './HistoryList';
import { HISTORY_TEXT } from '../content/history';
import { useText } from '../i18n/useText';
import type { ClearHistoryControls } from '../hooks/useClearHistory';
import type { AnalysisSummary } from '../lib/types';

interface HistoryContentProps {
  items: AnalysisSummary[];
  clearHistory: ClearHistoryControls;
}

/** The saved analyses, with the control to erase them and the reason when that fails. */
export function HistoryContent({ items, clearHistory }: HistoryContentProps) {
  const text = useText(HISTORY_TEXT);
  return (
    <>
      <HistoryList items={items} />
      <ClearHistory history={clearHistory} />
      {clearHistory.error && (
        <ErrorNotice title={text.clearFailed} message={clearHistory.error} className="mt-8" />
      )}
    </>
  );
}
