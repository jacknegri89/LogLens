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
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-[clamp(1.7rem,3.4vw,2.4rem)] leading-tight font-semibold tracking-tight">
          Past analyses
        </h1>
        {items && items.length > 0 && (
          <span className="font-mono text-sm text-muted">{items.length} saved</span>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-8 border-l-2 border-high pl-4">
          <p className="text-[15px] font-medium text-high">Could not load the history</p>
          <p className="mt-1 text-[15px] text-muted">{error}</p>
        </div>
      )}

      {items === null && !error && <p className="caret mt-8 text-[15px] text-muted">Loading</p>}

      {items && items.length === 0 && (
        <div className="mt-8 border border-rule-strong bg-panel p-8">
          <p className="text-[15px]">No analyses yet. Run a log and it is saved here.</p>
          <Link
            to="/"
            className="mt-5 inline-block bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-black"
          >
            Analyze a log
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <table className="mt-8 w-full border-collapse border border-rule-strong bg-panel text-left">
          <thead>
            <tr className="border-b border-rule-strong text-[13px] text-muted">
              <th className="px-4 py-2.5 font-medium">Severity</th>
              <th className="px-4 py-2.5 font-medium">Issue</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Category</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-rule last:border-0 hover:bg-paper">
                <td className="px-4 py-3 align-top">
                  <SeverityBadge severity={item.severity} />
                </td>
                <td className="max-w-0 px-4 py-3 align-top text-[15px] font-medium">
                  <Link to={`/analyses/${item.id}`} className="block truncate hover:underline">
                    {item.title}
                  </Link>
                </td>
                <td className="hidden px-4 py-3 align-top font-mono text-xs text-muted sm:table-cell">
                  {item.category}
                </td>
                <td className="hidden px-4 py-3 align-top font-mono text-xs text-muted md:table-cell">
                  {formatDate(item.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
