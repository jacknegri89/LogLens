import { TRACES_TEXT } from '../../content/workbenchInspect';
import { useText } from '../../i18n/useText';
import { useWorkbench } from '../core/useWorkbench';
import type { Correlation } from './correlationIds';
import { MAX_STEPS } from './useTraceView';
import { formatDelta, type Waterfall, type WaterfallStep } from './waterfall';

function StepTiming({ step }: { step: WaterfallStep }) {
  const text = useText(TRACES_TEXT);
  if (step.offsetMs === null) return <>{text.lineNumber(step.line.index + 1)}</>;
  const delta = step.deltaMs === null ? '' : `${formatDelta(step.deltaMs)} · `;
  return <>{delta + text.atOffset(formatDelta(step.offsetMs).slice(1))}</>;
}

function Step({ step }: { step: WaterfallStep }) {
  const text = useText(TRACES_TEXT);
  const { select, selectedIndex } = useWorkbench();
  const { line } = step;
  return (
    <li>
      <button
        type="button"
        className="trace-step"
        data-fault={line.isFault}
        aria-current={line.index === selectedIndex ? 'true' : undefined}
        onClick={() => select(line.index)}
      >
        <span className="trace-lane">{line.service ?? text.noService}</span>
        <span className="trace-timing">
          <StepTiming step={step} />
        </span>
        <span className="trace-track" aria-hidden="true">
          <span
            className="trace-bar"
            style={{ left: `${step.leftPercent}%`, width: `${step.widthPercent}%` }}
          />
        </span>
        <span className="trace-message">{line.message || line.raw}</span>
      </button>
    </li>
  );
}

/** The lines of one request in time order, each with its gap from the step before and a bar on a shared time axis. */
export function WaterfallView({
  correlation,
  waterfall,
}: {
  correlation: Correlation;
  waterfall: Waterfall;
}) {
  const text = useText(TRACES_TEXT);
  const steps = waterfall.steps.slice(0, MAX_STEPS);
  const subtitle = [
    text.lines(correlation.positions.length),
    text.services(correlation.services.length),
  ];
  if (waterfall.totalMs !== null)
    subtitle.push(`${text.total} ${formatDelta(waterfall.totalMs).slice(1)}`);

  return (
    <section className="trace-waterfall" aria-label={text.waterfallLabel(correlation.id)}>
      <header className="trace-waterfall-head">
        <h3 className="trace-waterfall-title">{correlation.id}</h3>
        <p className="trace-waterfall-sub">{subtitle.join(' · ')}</p>
      </header>
      {waterfall.totalMs === null && <p className="inspect-muted">{text.noTimes}</p>}
      {correlation.kind === 'pattern' && <p className="inspect-muted">{text.guessedNote}</p>}
      <ol className="trace-steps">
        {steps.map((step) => (
          <Step key={step.line.index} step={step} />
        ))}
      </ol>
      {waterfall.steps.length > MAX_STEPS && (
        <p className="inspect-muted">{text.moreSteps(waterfall.steps.length - MAX_STEPS)}</p>
      )}
    </section>
  );
}
