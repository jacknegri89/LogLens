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
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between border-b border-line/40 pb-6">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-signal uppercase">History</p>
          <h1 className="mt-2 text-3xl font-bold text-fg">Past analyses</h1>
        </div>
        {items && items.length > 0 && (
          <span className="font-mono text-sm text-fg-faint">{items.length} total</span>
        )}
      </header>

      {error && (
        <div className="rounded-xl border border-high/30 bg-high/10 px-4 py-3 text-sm text-high">
          {error}
        </div>
      )}

      {items === null && !error && (
        <div className="flex items-center gap-2.5 py-4">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
          <span className="font-mono text-sm text-fg-faint">Loading...</span>
        </div>
      )}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-line bg-surface/40 px-6 py-14 text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-fg-faint uppercase">
            No records yet
          </p>
          <p className="mt-3 text-sm text-fg-muted">Run your first analysis to see it here.</p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 font-mono text-sm text-signal hover:underline"
          >
            Analyze a log {'->'}
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/analyses/${item.id}`}
                className="group flex flex-col gap-2 rounded-xl border border-line bg-surface/30 px-5 py-4 transition-all hover:bg-surface hover:shadow-lg hover:shadow-black/25 hover:translate-x-0.5"
              >
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={item.severity} />
                  <span className="min-w-0 flex-1 truncate font-medium text-fg">
                    {item.title}
                  </span>
                  <span
                    className="shrink-0 text-fg-faint transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  >
                    {'->'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-fg-faint">
                  <span className="font-mono text-xs">{item.category}</span>
                  <span className="text-xs opacity-40">·</span>
                  <span className="font-mono text-xs">{formatDate(item.createdAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
