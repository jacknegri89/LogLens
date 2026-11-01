import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SeverityBadge } from '../components/SeverityBadge';
import { api } from '../lib/api';
import { formatDate, severityMeta } from '../lib/format';
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
    <div className="space-y-8 pt-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[clamp(2rem,5vw,3.4rem)] leading-none font-light tracking-tight">
          Past analyses
        </h1>
        {items && items.length > 0 && (
          <span className="font-mono text-sm text-fg-faint">{items.length} saved</span>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-high/30 bg-high/8 px-5 py-4"
        >
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-high" />
          <p className="text-sm text-fg">{error}</p>
        </div>
      )}

      {items === null && !error && (
        <div className="flex items-center gap-3 py-4">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-violet" />
          <span className="text-sm text-fg-faint">Loading analyses…</span>
        </div>
      )}

      {items && items.length === 0 && (
        <div className="glass px-6 py-16 text-center">
          <p className="font-display text-lg font-normal text-fg">Nothing analysed yet</p>
          <p className="mt-2 text-fg-muted">Analyse a log and it will be saved here.</p>
          <Link
            to="/"
            className="btn-photon mt-6 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold"
          >
            Analyze a log
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/analyses/${item.id}`}
                className="glass group relative flex flex-wrap items-center gap-x-5 gap-y-2 overflow-hidden px-6 py-5 transition-colors hover:bg-white/5"
              >
                <span
                  className="absolute inset-y-0 left-0 w-1 opacity-70 transition-opacity group-hover:opacity-100"
                  style={{ background: severityMeta[item.severity].glow }}
                  aria-hidden="true"
                />
                <SeverityBadge severity={item.severity} />
                <span className="min-w-0 flex-1 basis-64 truncate text-[15px] font-medium text-fg">
                  {item.title}
                </span>
                <span className="font-mono text-xs text-fg-faint">{item.category}</span>
                <span className="font-mono text-xs text-fg-faint">
                  {formatDate(item.createdAt)}
                </span>
                <span
                  className="text-fg-faint transition-transform group-hover:translate-x-1 group-hover:text-fg"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
