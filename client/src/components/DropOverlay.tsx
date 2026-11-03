import { ANALYZE_TEXT } from '../content/analyze';

/** Shown over the editor while a file is dragged on it: marching border and a scan beam. */
export function DropOverlay() {
  return (
    <div className="drop-overlay" aria-hidden="true">
      <span className="drop-beam" />
      <p className="relative font-mono text-lg font-bold">
        <span className="marker">{ANALYZE_TEXT.dropTitle}</span>
      </p>
      <p className="relative mt-3 font-mono text-sm text-ink-soft">{ANALYZE_TEXT.dropHint}</p>
    </div>
  );
}
