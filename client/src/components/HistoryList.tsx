import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { SeverityBadge } from './SeverityBadge';
import { HISTORY_TEXT } from '../content/history';
import { formatDate } from '../lib/format';
import type { AnalysisSummary } from '../lib/types';

/** The saved analyses as index cards in a drawer, newest first. */
export function HistoryList({ items }: { items: AnalysisSummary[] }) {
  return (
    <ol className="case-drawer case-drawer-grid">
      {items.map((item, index) => (
        <HistoryCard key={item.id} item={item} index={index} number={items.length - index} />
      ))}
    </ol>
  );
}

interface HistoryCardProps {
  item: AnalysisSummary;
  index: number;
  number: number;
}

function HistoryCard({ item, index, number }: HistoryCardProps) {
  return (
    <li className="case-entry" style={{ '--index': index } as CSSProperties}>
      <Link to={`/analyses/${item.id}`} className="case-card case-paper">
        <span className="case-tab" aria-hidden="true">
          {HISTORY_TEXT.caseNumber(number)}
        </span>
        <span className="case-card-head">
          <SeverityBadge severity={item.severity} />
          <time className="case-date" dateTime={item.createdAt}>
            {formatDate(item.createdAt)}
          </time>
        </span>
        <span className="case-label">
          <span className="case-title">{item.title}</span>
        </span>
        <span className="case-card-foot">
          <span className="case-category">{item.category}</span>
          <span className="case-open">{HISTORY_TEXT.openCard}</span>
        </span>
      </Link>
    </li>
  );
}
