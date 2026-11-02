import { Link } from 'react-router-dom';

import { ErrorNotice } from '../components/ErrorNotice';
import { HistoryList } from '../components/HistoryList';
import { ERROR_TEXT } from '../content/errors';
import { HISTORY_TEXT } from '../content/history';
import { useLoad } from '../hooks/useLoad';
import { api } from '../lib/api';

export function HistoryPage() {
  const { data: items, error } = useLoad(
    () => api.listAnalyses(),
    [],
    ERROR_TEXT.loadHistoryFallback,
  );

  return (
    <div>
      <HistoryHeading count={items?.length ?? null} />
      {error && <ErrorNotice title={ERROR_TEXT.historyFailed} message={error} className="mt-10" />}
      {items === null && !error && (
        <p className="caret mt-10 text-lg text-chalk">{HISTORY_TEXT.loading}</p>
      )}
      {items && items.length === 0 && <EmptyHistory />}
      {items && items.length > 0 && <HistoryList items={items} />}
    </div>
  );
}

function HistoryHeading({ count }: { count: number | null }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
      <h1 className="text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.95] font-extrabold tracking-tight uppercase [font-stretch:125%]">
        {HISTORY_TEXT.titleStart} <span className="marker">{HISTORY_TEXT.titleMarked}</span>
      </h1>
      {count !== null && count > 0 && (
        <span className="font-mono text-base font-bold text-chalk">
          {HISTORY_TEXT.savedCount(count)}
        </span>
      )}
    </div>
  );
}

function EmptyHistory() {
  return (
    <div className="mt-10 bg-paper p-8 text-ink">
      <p className="text-lg">{HISTORY_TEXT.empty}</p>
      <Link
        to="/"
        className="btn-ink mt-6 inline-block px-6 py-2.5 text-sm font-bold tracking-wide uppercase"
      >
        {HISTORY_TEXT.analyzeLink}
      </Link>
    </div>
  );
}
