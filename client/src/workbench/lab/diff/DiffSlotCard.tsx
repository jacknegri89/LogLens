import { useMemo, useRef } from 'react';

import { LAB_TEXT } from '../../../content/workbenchLab';
import { useText } from '../../../i18n/useText';
import { parseLines } from '../../core/basicParse';
import type { Slot, SlotError } from './useDiffSlots';
import { MAX_DIFF_FILE_MEGABYTES } from './useDiffSlots';

interface DiffSlotCardProps {
  id: string;
  title: string;
  slot: Slot;
  error: SlotError | undefined;
  onPaste: (text: string) => void;
  onFile: (file: File) => void;
  onUseLoaded: () => void;
  onClear: () => void;
}

export function DiffSlotCard(props: DiffSlotCardProps) {
  const filled = props.slot.text !== '' && props.slot.source !== 'paste';

  return (
    <section className="lab-card" aria-labelledby={`lab-slot-${props.id}`}>
      <h3 id={`lab-slot-${props.id}`} className="lab-label">
        {props.title}
      </h3>
      {filled && <SlotSummary slot={props.slot} />}
      {!filled && <PasteArea {...props} />}
      <SlotActions {...props} />
      {props.error && <SlotProblem error={props.error} />}
    </section>
  );
}

function SlotActions({ title, slot, onFile, onUseLoaded, onClear }: DiffSlotCardProps) {
  const text = useText(LAB_TEXT).diff;
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="lab-actions">
      <button type="button" className="lab-button" onClick={() => fileInput.current?.click()}>
        {text.openFile}
      </button>
      <button type="button" className="lab-button" onClick={onUseLoaded}>
        {text.useLoaded}
      </button>
      {slot.text !== '' && (
        <button type="button" className="lab-button" onClick={onClear}>
          {text.clear}
        </button>
      )}
      <input
        ref={fileInput}
        type="file"
        accept=".log,.txt,text/plain"
        aria-label={text.fileLabel(title)}
        className="lab-file-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) {
            onFile(file);
          }
        }}
      />
    </div>
  );
}

function PasteArea({ id, title, slot, onPaste }: DiffSlotCardProps) {
  const text = useText(LAB_TEXT).diff;
  return (
    <textarea
      id={`lab-paste-${id}`}
      value={slot.text}
      onChange={(event) => onPaste(event.target.value)}
      aria-label={text.pasteLabel(title)}
      placeholder={text.pastePlaceholder}
      spellCheck={false}
      rows={7}
      className="lab-input lab-textarea"
    />
  );
}

/** A big log is described and not drawn in a text box, which would be slow to scroll and type in. */
function SlotSummary({ slot }: { slot: Slot }) {
  const text = useText(LAB_TEXT).diff.source;
  const lineCount = useMemo(() => parseLines(slot.text).length, [slot.text]);
  let label = text.workbench(lineCount);
  if (slot.source === 'file') {
    label = text.file(slot.name ?? '', lineCount);
  }
  return <p className="lab-summary-line">{label}</p>;
}

function SlotProblem({ error }: { error: SlotError }) {
  const text = useText(LAB_TEXT).diff;
  const messages: Record<SlotError, string> = {
    tooBig: text.fileTooBig(MAX_DIFF_FILE_MEGABYTES),
    unreadable: text.fileUnreadable,
    noLoadedLog: text.noLoadedLog,
  };
  return (
    <p role="alert" className="lab-problem">
      {messages[error]}
    </p>
  );
}
