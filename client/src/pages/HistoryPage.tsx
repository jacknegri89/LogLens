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
    <div className="space-y-6">
      <header>
        <p className="font-mono text-xs tracking-[0.3em] text-signal uppercase">History</p>
        <h1 className="mt-3 text-3xl font-bold text-fg">Past analyses</h1>
      </header>

      {error && (
        <div className="rounded-xl border border-high/40 bg-high/10 px-4 py-3 text-sm text-high">
          {error}
        </div>
      )}

      {items === null && !error && <p className="font-mono text-sm text-fg-faint">Loading...</p>}

      {items && items.length === 0 && (
        <div className="rounded-xl border border-line bg-surface/50 px-6 py-12 text-center">
          <p className="text-fg-muted">No analyses yet.</p>
          <Link to="/" className="mt-2 inline-block font-mono text-sm text-signal hover:underline">
            Analyze your first log {'->'}
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/analyses/${item.id}`}
                className="flex items-center gap-4 rounded-xl border border-line bg-surface/40 px-4 py-3.5 transition-colors hover:border-signal/40 hover:bg-surface"
              >
                <SeverityBadge severity={item.severity} />
                <span className="min-w-0 flex-1 truncate text-fg">{item.title}</span>
                <span className="hidden font-mono text-xs text-fg-muted sm:inline">
                  {item.category}
                </span>
                <span className="hidden font-mono text-xs text-fg-faint md:inline">
                  {formatDate(item.createdAt)}
                </span>
                <span className="text-fg-faint" aria-hidden>
                  {'->'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
