import { DETAIL_TEXT } from '../content/detail';
import { useText } from '../i18n/useText';

/** The raw log, folded away in the case file so the report stays on top. */
export function OriginalLog({ rawLog }: { rawLog: string }) {
  const text = useText(DETAIL_TEXT);
  return (
    <details className="report-original">
      <summary className="report-original-summary">
        <span className="report-original-title">{text.originalLog}</span>
        <span className="report-original-hint">{text.originalLogHint}</span>
        <span className="evidence-label">{text.lineCount(rawLog.split('\n').length)}</span>
      </summary>
      <div className="report-original-sheet bands perforated">
        <pre tabIndex={0} aria-label={text.originalLog}>
          {rawLog}
        </pre>
      </div>
    </details>
  );
}
