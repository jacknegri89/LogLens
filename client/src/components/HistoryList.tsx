import { Link } from 'react-router-dom';

import { SeverityBadge } from './SeverityBadge';
import { formatDate } from '../lib/format';
import type { AnalysisSummary } from '../lib/types';

/** The saved analyses as a strip of paper, one row each. */
export function HistoryList({ items }: { items: AnalysisSummary[] }) {
  return (
    <ul className="perforated bands relative mt-10 py-2 pr-9 pl-10 text-ink">
      {items.map((item) => (
        <HistoryRow key={item.id} item={item} />
      ))}
    </ul>
  );
}

function HistoryRow({ item }: { item: AnalysisSummary }) {
  return (
    <li>
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
  );
}
