import { INSIGHTS_TEXT } from '../../content/workbenchInsights';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';
import { AnalyzePrompt } from './AnalyzePrompt';
import { BlastRadius } from './BlastRadius';
import { CausesSection } from './CausesSection';
import { FlamegraphSection } from './FlamegraphSection';
import { MetricsRow } from './MetricsRow';
import { useInsightsModel } from './useInsightsModel';

import '../../styles/workbench-insights.css';

/** Risk, repair time, cause ranking, blast radius and latency of the loaded log. */
export function InsightsPanel() {
  const { lines } = useWorkbench();
  const text = useText(INSIGHTS_TEXT);
  const { report, topology, flameTree, latency } = useInsightsModel();

  if (lines.length === 0) return <p className="insights-note">{text.noLog}</p>;
  return (
    <div className="insights">
      {report ? (
        <>
          <MetricsRow report={report} />
          <CausesSection confidence={report.confidence} explanation={report.explanation} />
        </>
      ) : (
        <AnalyzePrompt />
      )}
      <BlastRadius topology={topology} />
      <FlamegraphSection tree={flameTree} latency={latency} />
    </div>
  );
}
