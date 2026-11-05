import { REPORT_TEXT } from '../content/report';
import type { TextOf } from '../i18n/defineText';
import { useText } from '../i18n/useText';
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
  const text = useText(REPORT_TEXT);
  const pinned = entry.role !== 'independent';
  let decoration = <span className="tape tape-top" aria-hidden="true" />;
  if (pinned) {
    decoration = <span className="pin" data-pin={index} aria-hidden="true" />;
  }
  return (
    <li className="report-evidence evidence-card" data-role={entry.role}>
      {decoration}
      <p className="report-evidence-top">
        <span className="evidence-tag">{text.evidenceTag(index)}</span>
        {entry.time && <span className="report-evidence-time">{entry.time}</span>}
        <SeverityBadge severity={entry.severity} />
      </p>
      <h4 className="report-evidence-title">{entry.title}</h4>
      <p className="report-evidence-category">{entry.category}</p>
      <p className="report-evidence-line">{entry.evidence}</p>
      <p className="report-evidence-role">{roleText(text, entry.role, rootIndex)}</p>
    </li>
  );
}

function roleText(
  text: TextOf<typeof REPORT_TEXT>,
  role: TimelineEntry['role'],
  rootIndex?: number,
): string {
  if (role === 'effect' && rootIndex !== undefined) {
    return `${text.roleLabels.effect} · ${text.causedBy(rootIndex)}`;
  }
  return text.roleLabels[role];
}
