import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';

import '../../styles/workbench-insights.css';

/** Shown until the log is analyzed: says what the analysis unlocks and starts it. */
export function AnalyzePrompt() {
  const { analyze, analysis } = useWorkbench();
  const text = useText(INSIGHTS_TEXT).analyze;
  const loading = analysis.status === 'loading';

  return (
    <div className="insights-prompt evidence-sheet">
      <div>
        <h2 className="insights-prompt-title">{text.title}</h2>
        <p className="insights-prompt-body">{text.body}</p>
      </div>
      <button
        type="button"
        onClick={analyze}
        disabled={loading}
        aria-busy={loading}
        className="btn-ink insights-prompt-button"
      >
        {loading && <span className="insights-spinner" aria-hidden="true" />}
        {loading ? text.loading : text.button}
      </button>
    </div>
  );
}
