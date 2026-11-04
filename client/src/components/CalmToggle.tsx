import { LAYOUT_TEXT } from '../content/layout';
import { useCalmMode } from '../hooks/useCalmMode';
import { useText } from '../i18n/useText';

/** A small switch in the header: it stops every animation, for a calmer and lighter page. */
export function CalmToggle() {
  const text = useText(LAYOUT_TEXT);
  const { calm, toggle } = useCalmMode();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={calm}
      title={text.calmHint}
      aria-label={text.calmLabel}
      className="calm-toggle"
    >
      <span className="calm-toggle-dot" aria-hidden="true" />
      <span className="calm-toggle-text">{text.calmLabel}</span>
    </button>
  );
}
