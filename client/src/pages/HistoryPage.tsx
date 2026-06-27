import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SeverityBadge } from '../components/SeverityBadge';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import type { AnalysisSummary } from '../lib/types';

export function HistoryPage() {
  const [items, setItems] = useState<AnalysisSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listAnalyses()
      .then(setItems)
      .catch((err: unknown) => {
        let message = 'Failed to load';
        if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
      });
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between border-b border-line pb-5">
        <div>
          <p className="font-head text-[9px] font-semibold tracking-[0.3em] uppercase text-signal">
            Incident log
          </p>
          <h1 className="mt-1.5 font-head text-[28px] font-extrabold uppercase tracking-[0.04em] text-fg">
            Past Analyses
          </h1>
        </div>
        {items && items.length > 0 && (
          <span className="font-mono text-[10px] text-fg-faint">{items.length} records</span>
        )}
      </header>

      {error && (
        <div className="flex items-start gap-2.5 rounded border border-high/20 bg-high/6 px-4 py-3">
          <span className="mt-0.5 font-mono text-[10px] text-high">!</span>
          <p className="text-xs text-high/90">{error}</p>
        </div>
      )}

      {items === null && !error && (
        <div className="flex items-center gap-2 py-4">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
          <span className="font-mono text-[10px] tracking-[0.1em] text-fg-faint">Loading</span>
        </div>
      )}

      {items && items.length === 0 && (
        <div className="rounded border border-line bg-surface px-6 py-12 text-center">
          <p className="font-head text-[11px] font-bold tracking-[0.2em] uppercase text-fg-faint">
            No records yet
          </p>
          <p className="mt-2 text-xs text-fg-faint">Run your first analysis to see it here.</p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 font-head text-[10px] font-semibold tracking-[0.15em] uppercase text-signal transition-opacity hover:opacity-80"
          >
            Analyze a log {'->'}
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div>
          <div className="mb-1 grid grid-cols-[90px_1fr_110px_130px_16px] gap-3 px-3 py-1.5">
            {['Severity', 'Issue', 'Category', 'Date', ''].map((col) => (
              <span
                key={col}
                className="font-head text-[8px] font-semibold tracking-[0.2em] uppercase text-fg-faint"
              >
                {col}
              </span>
            ))}
          </div>
          <ul>
            {items.map((item) => (
              <li key={item.id} className="border-t border-line first:border-0">
                <Link
                  to={`/analyses/${item.id}`}
                  className="group grid grid-cols-[90px_1fr_110px_130px_16px] items-center gap-3 rounded-sm px-3 py-3 transition-colors hover:bg-surface"
                >
                  <SeverityBadge severity={item.severity} />
                  <span className="min-w-0 truncate text-xs font-medium text-fg">{item.title}</span>
                  <span className="font-mono text-[9px] text-fg-faint">{item.category}</span>
                  <span className="font-mono text-[9px] text-fg-faint">
                    {formatDate(item.createdAt)}
                  </span>
                  <span
                    className="text-right font-mono text-[10px] text-fg-faint transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  >
                    {'->'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
