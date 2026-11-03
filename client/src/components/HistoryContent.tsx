import { ClearHistory } from './ClearHistory';
import { ErrorNotice } from './ErrorNotice';
import { HistoryList } from './HistoryList';
import { HISTORY_TEXT } from '../content/history';
import type { ClearHistoryControls } from '../hooks/useClearHistory';
import type { AnalysisSummary } from '../lib/types';

interface HistoryContentProps {
  items: AnalysisSummary[];
  clearHistory: ClearHistoryControls;
}

/** The saved analyses, with the control to erase them and the reason when that fails. */
export function HistoryContent({ items, clearHistory }: HistoryContentProps) {
  return (
    <>
      <HistoryList items={items} />
      <ClearHistory history={clearHistory} />
      {clearHistory.error && (
        <ErrorNotice
          title={HISTORY_TEXT.clearFailed}
          message={clearHistory.error}
          className="mt-8"
        />
      )}
    </>
  );
}
