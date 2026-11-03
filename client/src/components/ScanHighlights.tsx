import type { CSSProperties } from 'react';

import { ANALYZE_TEXT } from '../content/analyze';
import type { ScanRow } from '../lib/scanRows';

/** Delay between two lines lighting up, so they read as a sequence. */
const STEP_MS = 320;
/** The tag is slapped on once the highlighter stroke has crossed the line. */
const TAG_AFTER_MS = 240;

function rowStyle(row: ScanRow, order: number): CSSProperties {
  const markDelay = order * STEP_MS;
  return {
    top: row.top,
    height: row.height,
    '--mark-delay': `${markDelay}ms`,
    '--tag-delay': `${markDelay + TAG_AFTER_MS}ms`,
  } as CSSProperties;
}

/**
 * While the log is read, the suspicious lines get the highlighter one after the
 * other, and each gets a numbered evidence tag (E1, E2...) stamped at its end.
 */
export function ScanHighlights({ rows }: { rows: ScanRow[] }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {rows.map((row, order) => (
        <span key={`${row.top}-${order}`} className="scan-row" style={rowStyle(row, order)}>
          <span className="evidence-tag evidence-tag-stamp">
            {ANALYZE_TEXT.evidenceTag(order + 1)}
          </span>
        </span>
      ))}
    </div>
  );
}
