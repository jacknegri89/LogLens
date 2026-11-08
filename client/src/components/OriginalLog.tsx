import { useEffect, useMemo, useRef } from 'react';

import { DETAIL_TEXT } from '../content/detail';
import { useLogFocus } from '../hooks/useLogFocus';
import { useText } from '../i18n/useText';
import { splitLogAroundRange, type LineRange } from '../lib/logFocus';

/**
 * The raw log, folded away in the case file so the report stays on top. When the address points at
 * lines (`#log-12`), as a piece of evidence does, the log opens and those lines are highlighted.
 */
export function OriginalLog({ rawLog }: { rawLog: string }) {
  const text = useText(DETAIL_TEXT);
  const range = useLogFocus();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const markRef = useRef<HTMLElement>(null);
  const parts = useMemo(() => partsOf(rawLog, range), [rawLog, range]);

  useEffect(() => {
    if (range === null) {
      return;
    }
    if (detailsRef.current) {
      detailsRef.current.open = true;
    }
    markRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [range]);

  return (
    <details className="report-original" ref={detailsRef}>
      <summary className="report-original-summary">
        <span className="report-original-title">{text.originalLog}</span>
        <span className="report-original-hint">{text.originalLogHint}</span>
        <span className="evidence-label">{text.lineCount(rawLog.split('\n').length)}</span>
      </summary>
      <div className="report-original-sheet bands perforated">
        <pre tabIndex={0} aria-label={text.originalLog}>
          {parts.before}
          {parts.focus !== '' && (
            <mark id="log-focus" className="report-original-focus" ref={markRef}>
              {parts.focus}
            </mark>
          )}
          {parts.after}
        </pre>
      </div>
    </details>
  );
}

function partsOf(rawLog: string, range: LineRange | null) {
  if (range === null) {
    return { before: rawLog, focus: '', after: '' };
  }
  return splitLogAroundRange(rawLog, range);
}
