import { useRef } from 'react';

import { useRowHeights } from '../hooks/useRowHeights';
import { editorRows } from '../lib/format';
import { EditorGutter } from './EditorGutter';
import { EditorTextBox } from './EditorTextBox';

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

  return (
    <div className="h-[30rem] overflow-x-hidden overflow-y-auto">
      <div className="bands flex min-h-full font-mono text-[14px] leading-[22px]">
        <EditorGutter rows={editorRows(text)} rowHeights={rowHeights} failingLines={failingLines} />
        <EditorTextBox
          text={text}
          mirrorRef={mirrorRef}
          onTextChange={onTextChange}
          onSubmitShortcut={onSubmitShortcut}
        />
      </div>
    </div>
  );
}
