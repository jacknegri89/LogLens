import { FEEDBACK_TEXT } from '../content/feedback';
import { useFeedback } from '../hooks/useFeedback';
import { ACTION_BUTTON_CLASS } from '../lib/styles';
import { ReportSection } from './ReportSection';

interface FeedbackBlockProps {
  analysisId: string;
  initialHelpful: boolean | null;
}

/** Two toggle buttons: the visitor says whether the analysis helped. */
export function FeedbackBlock({ analysisId, initialHelpful }: FeedbackBlockProps) {
  const { helpful, saving, error, choose } = useFeedback(analysisId, initialHelpful);

  return (
    <ReportSection title={FEEDBACK_TEXT.title}>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          aria-pressed={helpful === true}
          disabled={saving}
          onClick={() => choose(true)}
          className={ACTION_BUTTON_CLASS}
        >
          {FEEDBACK_TEXT.useful}
        </button>
        <button
          type="button"
          aria-pressed={helpful === false}
          disabled={saving}
          onClick={() => choose(false)}
          className={ACTION_BUTTON_CLASS}
        >
          {FEEDBACK_TEXT.notUseful}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 border-l-4 border-marker pl-4 text-chalk">
          {error}
        </p>
      )}
    </ReportSection>
  );
}
