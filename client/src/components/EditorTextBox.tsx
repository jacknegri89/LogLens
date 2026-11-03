import type { RefObject } from 'react';

import { ANALYZE_TEXT } from '../content/analyze';
import { useText } from '../i18n/useText';
import type { ScanRow } from '../lib/scanRows';
import { LogTextarea } from './LogTextarea';
import { MirrorText } from './MirrorText';
import { ScanHighlights } from './ScanHighlights';

/** The text area and the hidden mirror that sizes it, side by side with the gutter. */
export function EditorTextBox({
  text,
  mirrorRef,
  scanRows,
  onTextChange,
  onSubmitShortcut,
}: {
  text: string;
  mirrorRef: RefObject<HTMLDivElement | null>;
  scanRows: ScanRow[];
  onTextChange: (text: string) => void;
  onSubmitShortcut: () => void;
}) {
  const labels = useText(ANALYZE_TEXT);
  return (
    <>
      <label htmlFor="log-input" className="sr-only">
        {labels.editorLabel}
      </label>
      <div className="relative min-w-0 flex-1">
        <MirrorText text={text} mirrorRef={mirrorRef} />
        {scanRows.length > 0 && <ScanHighlights rows={scanRows} />}
        <LogTextarea text={text} onTextChange={onTextChange} onSubmitShortcut={onSubmitShortcut} />
      </div>
    </>
  );
}
