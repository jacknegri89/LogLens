import '../../styles/workbench-security.css';

import { SECURITY_TEXT } from '../../content/workbenchSecurity';
import { useText } from '../../i18n/useText';
import { useScrubLog } from './useScrubLog';

/** One click sanitizes the loaded log; a badge then says how much was replaced and offers Undo. */
export function ScrubButton() {
  const text = useText(SECURITY_TEXT).scrub;
  const { scrub, undo, canScrub, result } = useScrubLog();
  const replaced = result !== null && result.occurrences > 0;

  return (
    <div className="sec-scrub">
      <button
        type="button"
        onClick={scrub}
        disabled={!canScrub}
        title={text.hint}
        className="btn-paper px-4 py-2.5 text-sm font-bold tracking-wide uppercase disabled:cursor-not-allowed disabled:opacity-40"
      >
        {text.button}
      </button>
      <span role="status" className="sec-scrub-badge" data-empty={result === null}>
        {result !== null && (replaced ? text.done(result.occurrences) : text.nothing)}
      </span>
      {replaced && (
        <button type="button" onClick={undo} title={text.undoHint} className="sec-scrub-undo">
          {text.undo}
        </button>
      )}
    </div>
  );
}
