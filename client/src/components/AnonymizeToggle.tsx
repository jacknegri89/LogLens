import { useId } from 'react';

import { ANALYZE_TEXT } from '../content/analyze';
import { useText } from '../i18n/useText';

export interface AnonymizeToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Checkbox that makes the browser hide IPs, e-mails, secrets and user names before sending. */
export function AnonymizeToggle({ checked, onChange }: AnonymizeToggleProps) {
  const text = useText(ANALYZE_TEXT);
  const hintId = useId();

  return (
    <label
      title={text.anonymizeHint}
      className="flex cursor-pointer items-center gap-2 text-sm font-bold"
    >
      <input
        type="checkbox"
        checked={checked}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 cursor-pointer accent-ink"
      />
      <span>{text.anonymizeLabel}</span>
      <span id={hintId} className="sr-only">
        {text.anonymizeHint}
      </span>
    </label>
  );
}
