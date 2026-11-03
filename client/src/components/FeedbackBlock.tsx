import { FEEDBACK_TEXT } from '../content/feedback';
import { useText } from '../i18n/useText';
import { useFeedback } from '../hooks/useFeedback';
import { ACTION_BUTTON_CLASS } from '../lib/styles';
import { ToolDrawer } from './ToolDrawer';

interface FeedbackBlockProps {
  analysisId: string;
  initialHelpful: boolean | null;
}

/** Two toggle buttons: the visitor says whether the analysis helped. */
export function FeedbackBlock({ analysisId, initialHelpful }: FeedbackBlockProps) {
  const text = useText(FEEDBACK_TEXT);
  const { helpful, saving, error, choose } = useFeedback(analysisId, initialHelpful);

  return (
    <ToolDrawer title={text.title} hint={text.hint} className="report-drawer-verdict">
      <div className="report-drawer-actions">
        <button
          type="button"
          aria-pressed={helpful === true}
          disabled={saving}
          onClick={() => choose(true)}
          className={ACTION_BUTTON_CLASS}
        >
          {text.useful}
        </button>
        <button
          type="button"
          aria-pressed={helpful === false}
          disabled={saving}
          onClick={() => choose(false)}
          className={ACTION_BUTTON_CLASS}
        >
          {text.notUseful}
        </button>
      </div>
      {error && (
        <p role="alert" className="report-drawer-error">
          {error}
        </p>
      )}
    </ToolDrawer>
  );
}
