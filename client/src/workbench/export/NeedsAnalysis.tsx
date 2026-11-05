import { EXPORT_TEXT } from '../../content/workbenchExport';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';

/** Shown instead of a preview when the format needs an analysis that has not been run yet. */
export function NeedsAnalysis() {
  const { analysis, analyze } = useWorkbench();
  const text = useText(EXPORT_TEXT);
  const loading = analysis.status === 'loading';
  let buttonText = text.analyzeNow;
  if (loading) {
    buttonText = text.analyzing;
  }

  return (
    <div className="exp-needs">
      <h3 className="exp-needs-title">{text.needsAnalysisTitle}</h3>
      <p className="exp-note">{text.needsAnalysisText}</p>
      <button type="button" onClick={analyze} disabled={loading} className="btn-ink exp-analyze">
        {buttonText}
      </button>
      {analysis.error && (
        <p role="alert" className="exp-error">
          {analysis.error}
        </p>
      )}
    </div>
  );
}
