import { LIVE_TAIL_TEXT } from '../../content/workbenchLab';
import { useText } from '../../i18n/useText';
import '../../styles/workbench-lab-tail.css';
import { useLiveTail } from './tail/useLiveTail';
import { MAX_TAIL_LINES } from './tail/scenarios';

/** Sits next to the Analyze button: streams a simulated log that ends in a fatal error. */
export function LiveTailControl() {
  const text = useText(LIVE_TAIL_TEXT);
  const { tail, fatalLine, start, stop, dismiss } = useLiveTail();
  const running = tail.scenario !== null;
  let action = start;
  let label = text.start;
  if (running) {
    action = stop;
    label = text.stop;
  }

  return (
    <div className="live-tail">
      <button
        type="button"
        aria-pressed={running}
        title={text.startHint}
        onClick={action}
        className="btn-paper live-tail-button"
      >
        {running && <span className="live-dot" aria-hidden="true" />}
        {label}
      </button>
      {tail.scenario && (
        <span className="live-tail-info">
          {text.scenarios[tail.scenario]}: {text.running(tail.appended)}
        </span>
      )}
      <div role="status" className="live-tail-status">
        {fatalLine !== null && <FatalBanner line={fatalLine} onDismiss={dismiss} />}
        {tail.limitReached && <LimitNotice onDismiss={dismiss} limit={MAX_TAIL_LINES} />}
      </div>
    </div>
  );
}

function FatalBanner({ line, onDismiss }: { line: number; onDismiss: () => void }) {
  const text = useText(LIVE_TAIL_TEXT);
  return (
    <p className="live-banner">
      <span>{text.fatalIntercepted(line)}</span>
      <span className="live-banner-hint">{text.analyzing}</span>
      <button type="button" onClick={onDismiss} className="live-banner-close">
        {text.dismiss}
      </button>
    </p>
  );
}

function LimitNotice({ limit, onDismiss }: { limit: number; onDismiss: () => void }) {
  const text = useText(LIVE_TAIL_TEXT);
  return (
    <p className="live-banner">
      <span>{text.limitReached(limit)}</span>
      <button type="button" onClick={onDismiss} className="live-banner-close">
        {text.dismiss}
      </button>
    </p>
  );
}
