import { ErrorNotice } from './ErrorNotice';
import { HISTORY_TEXT } from '../content/history';
import { useRemoveAnalysis } from '../hooks/useRemoveAnalysis';
import { useText } from '../i18n/useText';

interface RemoveAnalysisProps {
  analysisId: string;
  title: string;
  offline: boolean;
  onRemoved: (id: string) => void;
}

/** Under a history card: a Remove button that asks "Remove? Yes / No" before it deletes. */
export function RemoveAnalysis({ analysisId, title, offline, onRemoved }: RemoveAnalysisProps) {
  const text = useText(HISTORY_TEXT);
  const removal = useRemoveAnalysis(analysisId, offline, onRemoved);
  return (
    <div className="case-remove">
      {removal.confirming ? (
        <RemoveConfirmation title={title} removal={removal} />
      ) : (
        <button
          type="button"
          onClick={removal.start}
          aria-label={text.removeLabel(title)}
          className="case-remove-button"
        >
          {text.remove}
        </button>
      )}
      {removal.error && (
        <ErrorNotice title={text.removeFailed} message={removal.error} className="mt-3" />
      )}
    </div>
  );
}

interface RemoveConfirmationProps {
  title: string;
  removal: ReturnType<typeof useRemoveAnalysis>;
}

function RemoveConfirmation({ title, removal }: RemoveConfirmationProps) {
  const text = useText(HISTORY_TEXT);
  return (
    <div role="group" aria-label={text.removeConfirmLabel(title)} className="case-remove-confirm">
      <span className="case-remove-question">{text.removeQuestion}</span>
      <button
        type="button"
        onClick={removal.remove}
        disabled={removal.removing}
        className="case-remove-yes"
      >
        {removal.removing ? text.removing : text.removeYes}
      </button>
      <button
        type="button"
        onClick={removal.cancel}
        disabled={removal.removing}
        autoFocus
        className="case-remove-no"
      >
        {text.removeNo}
      </button>
    </div>
  );
}
