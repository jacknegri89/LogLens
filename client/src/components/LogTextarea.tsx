import type { KeyboardEvent } from 'react';

import { ANALYZE_TEXT } from '../content/analyze';
import { useText } from '../i18n/useText';

/** Ctrl + Enter (or Cmd + Enter) starts the analysis from the keyboard. */
function isSubmitShortcut(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  return (event.metaKey || event.ctrlKey) && event.key === 'Enter';
}

export function LogTextarea({
  text,
  onTextChange,
  onSubmitShortcut,
}: {
  text: string;
  onTextChange: (text: string) => void;
  onSubmitShortcut: () => void;
}) {
  const labels = useText(ANALYZE_TEXT);
  return (
    <textarea
      id="log-input"
      value={text}
      onChange={(event) => onTextChange(event.target.value)}
      onKeyDown={(event) => {
        if (!isSubmitShortcut(event)) {
          return;
        }
        event.preventDefault();
        onSubmitShortcut();
      }}
      placeholder={labels.editorPlaceholder}
      spellCheck={false}
      className="absolute inset-0 block h-full w-full resize-none overflow-hidden bg-transparent p-0 pl-4 whitespace-pre-wrap text-ink [overflow-wrap:anywhere] placeholder:text-ink-soft focus:outline-none"
    />
  );
}
