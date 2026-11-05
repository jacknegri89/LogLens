import { ANALYZE_TEXT } from '../content/analyze';
import { useText } from '../i18n/useText';
import { useStageProgress } from '../hooks/useStageProgress';

const STAGE_INTERVAL_MS = 1100;

function stageState(index: number, current: number): 'done' | 'active' | 'todo' {
  if (index < current) {
    return 'done';
  }
  if (index === current) {
    return 'active';
  }
  return 'todo';
}

/**
 * The wait for the report, typed on a taped index card: the status for screen
 * readers, then the stages ticked off in red pen, which only echo that status.
 */
export function AnalysisProgress() {
  const text = useText(ANALYZE_TEXT);
  const stages = text.analysisStages;
  const current = useStageProgress(stages.length, STAGE_INTERVAL_MS);

  return (
    <div className="evidence-card evidence-tilt-left mx-auto mt-4 max-w-md">
      <span className="tape tape-top" aria-hidden="true" />
      <p className="text-[1.6rem] leading-tight font-black uppercase [font-stretch:125%]">
        {text.readingLog}
      </p>
      <p className="mt-6 font-mono text-[15px] leading-7 text-ink-soft">{text.readingHint}</p>
      <div className="mt-3 space-y-2 font-mono text-[15px] leading-6" aria-hidden="true">
        {stages.map((stage, index) => {
          let className = '';
          if (index === current) {
            className = 'caret';
          }
          return (
            <div key={stage} className="stage-row" data-state={stageState(index, current)}>
              <span className="stage-box" />
              <span className={className}>{stage}</span>
            </div>
          );
        })}
      </div>
      <div className="progress-rail mt-6" aria-hidden="true">
        <span className="progress-sweep" />
      </div>
    </div>
  );
}
