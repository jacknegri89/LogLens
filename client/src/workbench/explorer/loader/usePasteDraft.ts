import { useState, type ClipboardEvent, type KeyboardEvent } from 'react';

import { useWorkbench } from '../../core/useWorkbench';

/**
 * The text typed in the paste box. Pasting into the empty box loads at once; typed text
 * loads with the button or Ctrl+Enter (Cmd+Enter on a Mac).
 */
export function usePasteDraft(onLoaded: () => void) {
  const { setLog } = useWorkbench();
  const [draft, setDraft] = useState('');

  const load = (value: string) => {
    if (value.trim() === '') return;
    setLog(value, null);
    setDraft('');
    onLoaded();
  };
  const loadPasted = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = event.clipboardData.getData('text');
    if (draft !== '' || pasted.trim() === '') return;
    event.preventDefault();
    load(pasted);
  };
  const loadOnShortcut = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    load(draft);
  };

  return { draft, setDraft, loadDraft: () => load(draft), loadPasted, loadOnShortcut };
}
