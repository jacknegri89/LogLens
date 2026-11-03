import { HISTORY_TEXT } from '../content/history';
import { useText } from '../i18n/useText';
import type { ClearHistoryControls } from '../hooks/useClearHistory';

/** The shred button that starts clearing the history, then the question that confirms it. */
export function ClearHistory({ history }: { history: ClearHistoryControls }) {
  if (!history.confirming) return <ClearButton onStart={history.start} />;

  return (
    <ClearConfirmation
      clearing={history.clearing}
      onConfirm={history.clear}
      onCancel={history.cancel}
    />
  );
}

function ClearButton({ onStart }: { onStart: () => void }) {
  const text = useText(HISTORY_TEXT);
  return (
    <div className="shred-row">
      <button type="button" onClick={onStart} className="shred-button">
        {text.clearButton}
      </button>
    </div>
  );
}

interface ClearConfirmationProps {
  clearing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ClearConfirmation({ clearing, onConfirm, onCancel }: ClearConfirmationProps) {
  const text = useText(HISTORY_TEXT);
  return (
    <div className="shred-row">
      <div role="group" aria-label={text.clearQuestion} className="shred-confirm">
        <p className="shred-question">{text.clearConfirm}</p>
        <div className="shred-actions">
          <button type="button" onClick={onConfirm} disabled={clearing} className="shred-button">
            {clearing ? text.clearing : text.clearYes}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={clearing}
            autoFocus
            className="shred-cancel"
          >
            {text.clearNo}
          </button>
        </div>
      </div>
    </div>
  );
}
