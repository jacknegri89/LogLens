import { FIX_TEXT } from '../../content/workbenchFix';
import { useText } from '../../i18n/useText';
import '../../styles/workbench-fix.css';
import { useCopyFeedback } from './useCopyFeedback';

interface CopyActionProps {
  text: string;
  label: string;
  /** Names the button for screen readers when several look alike on the page. */
  ariaLabel?: string;
}

/** A small button that copies the text and shows "Copied"; the result is also announced. */
export function CopyAction({ text, label, ariaLabel }: CopyActionProps) {
  const { copied, copy } = useCopyFeedback();
  const content = useText(FIX_TEXT).copy;
  let buttonText = label;
  let statusText = '';
  if (copied) {
    buttonText = content.copied;
    statusText = content.copied;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => copy(text)}
        aria-label={ariaLabel}
        className="fix-button"
      >
        {buttonText}
      </button>
      <span role="status" className="sr-only">
        {statusText}
      </span>
    </>
  );
}
