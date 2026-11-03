import { causedByLabel, REPORT_TEXT, ROLE_LABEL } from '../content/report';
import type { TimelineEntry } from '../lib/types';
import { SeverityBadge } from './SeverityBadge';

interface EvidenceCardProps {
  entry: TimelineEntry;
  index: number;
  /** Index of the root this effect is tied to, when the thread is drawn. */
  rootIndex?: number;
}

/**
 * One event of the incident as an index card. Cards in the chain are pinned (the red thread
 * is tied to the pin); a card with no link is only taped down, set apart from the chain.
 */
export function EvidenceCard({ entry, index, rootIndex }: EvidenceCardProps) {
  const pinned = entry.role !== 'independent';
  return (
    <li className="report-evidence evidence-card" data-role={entry.role}>
      {pinned ? (
        <span className="pin" data-pin={index} aria-hidden="true" />
      ) : (
        <span className="tape tape-top" aria-hidden="true" />
      )}
      <p className="report-evidence-top">
        <span className="evidence-tag">{REPORT_TEXT.evidenceTag(index)}</span>
        {entry.time && <span className="report-evidence-time">{entry.time}</span>}
        <SeverityBadge severity={entry.severity} />
      </p>
      <h4 className="report-evidence-title">{entry.title}</h4>
      <p className="report-evidence-category">{entry.category}</p>
      <p className="report-evidence-line">{entry.evidence}</p>
      <p className="report-evidence-role">{roleText(entry.role, rootIndex)}</p>
    </li>
  );
}

function roleText(role: TimelineEntry['role'], rootIndex?: number): string {
  if (role === 'effect' && rootIndex !== undefined) {
    return `${ROLE_LABEL.effect} · ${causedByLabel(rootIndex)}`;
  }
  return ROLE_LABEL[role];
}
