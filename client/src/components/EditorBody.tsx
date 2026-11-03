import { useRef } from 'react';

import { useRowHeights } from '../hooks/useRowHeights';
import { editorRows } from '../lib/format';
import { scanRows } from '../lib/scanRows';
import { EditorGutter } from './EditorGutter';
import { EditorTextBox } from './EditorTextBox';

interface EditorBodyProps {
  text: string;
  failingLines: Set<number>;
  scanning: boolean;
  revealKey: number;
  onTextChange: (text: string) => void;
  onSubmitShortcut: () => void;
}

export function EditorBody({
  text,
  failingLines,
  scanning,
  revealKey,
  ...handlers
}: EditorBodyProps) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const rowHeights = useRowHeights(mirrorRef, text);

  return (
    <div className="editor-window relative">
      <div className="h-[30rem] overflow-x-hidden overflow-y-auto">
        <div className="bands flex min-h-full font-mono text-[14px] leading-[22px]">
          <EditorGutter
            rows={editorRows(text)}
            rowHeights={rowHeights}
            failingLines={failingLines}
          />
          <EditorTextBox
            text={text}
            mirrorRef={mirrorRef}
            scanRows={scanning ? scanRows(text, rowHeights) : []}
            {...handlers}
          />
        </div>
      </div>
      {scanning && <span className="scan-bar" aria-hidden="true" />}
      {revealKey > 0 && <span key={revealKey} className="print-cover" aria-hidden="true" />}
    </div>
  );
}
