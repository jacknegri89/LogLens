import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { RemoveAnalysis } from './RemoveAnalysis';
import { SeverityBadge } from './SeverityBadge';
import { HISTORY_TEXT } from '../content/history';
import { useFormatDate } from '../hooks/useFormatDate';
import { useText } from '../i18n/useText';
import type { AnalysisSummary } from '../lib/types';

interface HistoryListProps {
  items: AnalysisSummary[];
  /** True when the rows are the copy kept in this browser. */
  offline: boolean;
  onRemoved: (id: string) => void;
}

/** The saved analyses as index cards in a drawer, newest first. */
export function HistoryList({ items, offline, onRemoved }: HistoryListProps) {
  return (
    <ol className="case-drawer case-drawer-grid">
      {items.map((item, index) => (
        <li key={item.id} className="case-entry" style={{ '--index': index } as CSSProperties}>
          <HistoryCard item={item} number={items.length - index} />
          <RemoveAnalysis
            analysisId={item.id}
            title={item.title}
            offline={offline}
            onRemoved={onRemoved}
          />
        </li>
      ))}
    </ol>
  );
}

function HistoryCard({ item, number }: { item: AnalysisSummary; number: number }) {
  const text = useText(HISTORY_TEXT);
  const formatDate = useFormatDate();
  return (
    <Link to={`/analyses/${item.id}`} className="case-card case-paper">
      <span className="case-tab" aria-hidden="true">
        {text.caseNumber(number)}
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
        <span className="case-open">{text.openCard}</span>
      </span>
    </Link>
  );
}
