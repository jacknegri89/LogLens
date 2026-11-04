import { useId } from 'react';

import { ANALYZE_TEXT } from '../content/analyze';
import { useText } from '../i18n/useText';

export interface AnonymizeToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Checkbox that makes the browser hide IPs, e-mails, secrets and user names before sending.
 * The real input stays in the tab order; the drawn box shows its state.
 */
export function AnonymizeToggle({ checked, onChange }: AnonymizeToggleProps) {
  const text = useText(ANALYZE_TEXT);
  const hintId = useId();

  return (
    <label title={text.anonymizeHint} className="anonymize-toggle text-sm">
      <input
        type="checkbox"
        checked={checked}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.checked)}
        className="anonymize-input"
      />
      <span className="anonymize-box" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false">
          <path d="M2.5 8.6 6.2 12.2 13.5 4.2" />
        </svg>
      </span>
      <span>{text.anonymizeLabel}</span>
      <span id={hintId} className="sr-only">
        {text.anonymizeHint}
      </span>
    </label>
  );
}
