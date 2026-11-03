import { ANALYZE_TEXT } from '../content/analyze';

/** Shown over the sheet while a file is dragged on it: marching border, a beam and a waiting tag. */
export function DropOverlay() {
  return (
    <div className="drop-overlay" aria-hidden="true">
      <span className="drop-beam" />
      <span className="evidence-tag relative scale-150">{ANALYZE_TEXT.evidenceTag(1)}</span>
      <p className="relative mt-6 text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-black uppercase [font-stretch:125%]">
        <span className="marker">{ANALYZE_TEXT.dropTitle}</span>
      </p>
      <p className="relative mt-4 max-w-xs font-mono text-sm text-ink-soft">
        {ANALYZE_TEXT.dropHint}
      </p>
    </div>
  );
}
