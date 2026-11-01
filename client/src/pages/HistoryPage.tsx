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
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
        <h1 className="text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.95] font-extrabold tracking-tight uppercase [font-stretch:125%]">
          Past <span className="marker">analyses</span>
        </h1>
        {items && items.length > 0 && (
          <span className="font-mono text-base font-bold text-chalk">{items.length} saved</span>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-10 border-l-4 border-marker pl-4">
          <p className="text-lg font-bold">Could not load the history</p>
          <p className="mt-1 text-chalk">{error}</p>
        </div>
      )}

      {items === null && !error && <p className="caret mt-10 text-lg text-chalk">Loading</p>}

      {items && items.length === 0 && (
        <div className="mt-10 bg-paper p-8 text-ink">
          <p className="text-lg">No analyses yet. Run a log and it is saved here.</p>
          <Link
            to="/"
            className="btn-ink mt-6 inline-block px-6 py-2.5 text-sm font-bold tracking-wide uppercase"
          >
            Analyze a log
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="perforated bands relative mt-10 py-2 pr-9 pl-10 text-ink">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to={`/analyses/${item.id}`}
                className="group flex h-11 items-center gap-5 hover:bg-marker"
              >
                <span className="w-24 shrink-0">
                  <SeverityBadge severity={item.severity} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[16px] font-bold">{item.title}</span>
                <span className="hidden font-mono text-sm sm:block">{item.category}</span>
                <span className="hidden font-mono text-sm text-ink-soft md:block">
                  {formatDate(item.createdAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
