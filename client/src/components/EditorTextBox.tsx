import type { RefObject } from 'react';

import { ANALYZE_TEXT } from '../content/analyze';
import { LogTextarea } from './LogTextarea';
import { MirrorText } from './MirrorText';

/** The text area and the hidden mirror that sizes it, side by side with the gutter. */
export function EditorTextBox({
  text,
  mirrorRef,
  onTextChange,
  onSubmitShortcut,
}: {
  text: string;
  mirrorRef: RefObject<HTMLDivElement | null>;
  onTextChange: (text: string) => void;
  onSubmitShortcut: () => void;
}) {
  return (
    <>
      <label htmlFor="log-input" className="sr-only">
        {ANALYZE_TEXT.editorLabel}
      </label>
      <div className="relative min-w-0 flex-1">
        <MirrorText text={text} mirrorRef={mirrorRef} />
        <LogTextarea text={text} onTextChange={onTextChange} onSubmitShortcut={onSubmitShortcut} />
      </div>
    </>
  );
}
