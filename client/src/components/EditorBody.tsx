import { useRef } from 'react';

import { ANALYZE_TEXT } from '../content/analyze';
import { useRowHeights } from '../hooks/useRowHeights';
import { countLines } from '../lib/format';
import { EditorGutter } from './EditorGutter';
import { LogTextarea } from './LogTextarea';
import { MirrorText } from './MirrorText';

/** The editor always shows at least this many rows, so it looks like a sheet. */
const MIN_EDITOR_ROWS = 20;

export function EditorBody({
  text,
  failingLines,
  onTextChange,
  onSubmitShortcut,
}: {
  text: string;
  failingLines: Set<number>;
  onTextChange: (text: string) => void;
  onSubmitShortcut: () => void;
}) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const rowHeights = useRowHeights(mirrorRef, text);
  const rows = Math.max(countLines(text), MIN_EDITOR_ROWS);

  return (
    <div className="h-[30rem] overflow-x-hidden overflow-y-auto">
      <div className="bands flex min-h-full font-mono text-[14px] leading-[22px]">
        <EditorGutter rows={rows} rowHeights={rowHeights} failingLines={failingLines} />
        <label htmlFor="log-input" className="sr-only">
          {ANALYZE_TEXT.editorLabel}
        </label>
        <div className="relative min-w-0 flex-1">
          <MirrorText text={text} mirrorRef={mirrorRef} minRows={MIN_EDITOR_ROWS} />
          <LogTextarea
            text={text}
            onTextChange={onTextChange}
            onSubmitShortcut={onSubmitShortcut}
          />
        </div>
      </div>
    </div>
  );
}
