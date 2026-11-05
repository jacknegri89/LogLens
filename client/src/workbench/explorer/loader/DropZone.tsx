import { useRef } from 'react';

import { WORKBENCH_EXPLORER_TEXT } from '../../../content/workbenchExplorer';
import { useText } from '../../../i18n/useText';
import { ACCEPTED_FILES } from '../archive/extractLogText';

interface DropZoneProps {
  onFile: (file: File) => void;
  reading: boolean;
  dragging: boolean;
}

/** The drop target and the file picker; the whole loader accepts the drop, this shows it. */
export function DropZone({ onFile, reading, dragging }: DropZoneProps) {
  const text = useText(WORKBENCH_EXPLORER_TEXT).loader;
  const inputRef = useRef<HTMLInputElement>(null);
  let title = text.dropTitle;
  if (dragging) {
    title = text.dropActive;
  }

  return (
    <div className="wbx-drop" data-active={dragging || undefined}>
      <p className="wbx-drop-title">{title}</p>
      <p className="wbx-drop-hint">{text.dropHint}</p>
      <div className="wbx-drop-actions">
        <button
          type="button"
          className="wbx-button wbx-button-strong"
          onClick={() => inputRef.current?.click()}
        >
          {text.chooseFile}
        </button>
        <span role="status" className="wbx-drop-status">
          {reading && text.reading}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILES}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFile(file);
          }
          // Lets the same file be picked again.
          event.target.value = '';
        }}
      />
    </div>
  );
}
