import { DETAIL_TEXT } from '../content/detail';

/** The raw log, folded away in the case file so the report stays on top. */
export function OriginalLog({ rawLog }: { rawLog: string }) {
  return (
    <details className="report-original">
      <summary className="report-original-summary">
        <span className="report-original-title">{DETAIL_TEXT.originalLog}</span>
        <span className="report-original-hint">{DETAIL_TEXT.originalLogHint}</span>
        <span className="evidence-label">{DETAIL_TEXT.lineCount(rawLog.split('\n').length)}</span>
      </summary>
      <div className="report-original-sheet bands perforated">
        <pre tabIndex={0} aria-label={DETAIL_TEXT.originalLog}>
          {rawLog}
        </pre>
      </div>
    </details>
  );
}
