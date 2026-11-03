import { HISTORY_TEXT } from '../content/history';
import type { ClearHistoryControls } from '../hooks/useClearHistory';

/** The button that starts clearing the history, then the question that confirms it. */
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
  return (
    <div className="mt-6 flex justify-end">
      <button
        type="button"
        onClick={onStart}
        className="btn-ink px-5 py-2 text-sm font-bold tracking-wide uppercase"
      >
        {HISTORY_TEXT.clearButton}
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
  return (
    <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
      <p className="mr-auto text-lg text-chalk">{HISTORY_TEXT.clearConfirm}</p>
      <button
        type="button"
        onClick={onConfirm}
        disabled={clearing}
        className="btn-ink px-5 py-2 text-sm font-bold tracking-wide uppercase disabled:opacity-60"
      >
        {clearing ? HISTORY_TEXT.clearing : HISTORY_TEXT.clearYes}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={clearing}
        className="px-5 py-2 text-sm font-bold tracking-wide text-chalk uppercase underline disabled:opacity-60"
      >
        {HISTORY_TEXT.clearNo}
      </button>
    </div>
  );
}
