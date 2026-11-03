import { ANALYZE_TEXT } from '../content/analyze';
import { useStageProgress } from '../hooks/useStageProgress';

const STAGE_INTERVAL_MS = 1100;

function stageState(index: number, current: number): 'done' | 'active' | 'todo' {
  if (index < current) return 'done';
  return index === current ? 'active' : 'todo';
}

/**
 * The wait for the report: the status for screen readers, then the three stages
 * and a sweeping bar, which are only a visual echo of that status.
 */
export function AnalysisProgress() {
  const stages = ANALYZE_TEXT.analysisStages;
  const current = useStageProgress(stages.length, STAGE_INTERVAL_MS);

  return (
    <div>
      <p className="text-lg text-chalk">{ANALYZE_TEXT.readingLog}</p>
      <div className="mt-6 space-y-2.5 font-mono text-[15px]" aria-hidden="true">
        {stages.map((stage, index) => (
          <div key={stage} className="stage-row" data-state={stageState(index, current)}>
            <span className="stage-box" />
            <span className={index === current ? 'caret' : ''}>{stage}</span>
          </div>
        ))}
      </div>
      <div className="progress-rail mt-7" aria-hidden="true">
        <span className="progress-sweep" />
      </div>
    </div>
  );
}
