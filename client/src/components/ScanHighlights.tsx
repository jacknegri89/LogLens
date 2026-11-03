import type { ScanRow } from '../lib/scanRows';

/** Delay between two lines lighting up, so they read as a sequence. */
const STEP_MS = 260;

/** Highlighter strokes behind the suspicious lines while the log is being read. */
export function ScanHighlights({ rows }: { rows: ScanRow[] }) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {rows.map((row, order) => (
        <span
          key={`${row.top}-${order}`}
          className="scan-row"
          style={{ top: row.top, height: row.height, animationDelay: `${order * STEP_MS}ms` }}
        />
      ))}
    </div>
  );
}
