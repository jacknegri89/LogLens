import { useMemo, useRef } from 'react';

import { useRevealOnView } from '../hooks/useRevealOnView';
import { useThreadGeometry } from '../hooks/useThreadGeometry';
import { hasSetAsideEntries, threadLinks } from '../lib/thread';
import type { TimelineEntry } from '../lib/types';
import { CausalThread } from './CausalThread';
import { EvidenceCard } from './EvidenceCard';

/** Part of the board that must be on screen before the thread starts drawing. */
const REVEAL_THRESHOLD = 0.15;

/**
 * The incident as a board: one card per event in time order (an ordered list, so the
 * order and the links are read as text), with the red thread from each root cause to its
 * effects. Unlinked events get their own column on wide boards.
 */
export function EvidenceBoard({ entries }: { entries: TimelineEntry[] }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const links = useMemo(() => threadLinks(entries), [entries]);
  const rootOfEffect = useMemo(
    () => new Map(links.map((link) => [link.effectIndex, link.rootIndex])),
    [links],
  );
  const geometry = useThreadGeometry(boardRef, links);
  useRevealOnView(boardRef, REVEAL_THRESHOLD);

  return (
    <div ref={boardRef} className="report-board" data-set-aside={hasSetAsideEntries(entries)}>
      <ol className="report-board-list">
        {entries.map((entry, index) => (
          <EvidenceCard
            key={index}
            entry={entry}
            index={index}
            rootIndex={rootOfEffect.get(index)}
          />
        ))}
      </ol>
      {geometry && <CausalThread geometry={geometry} />}
    </div>
  );
}
