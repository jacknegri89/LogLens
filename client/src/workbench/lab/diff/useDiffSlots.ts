import { useState } from 'react';

import { useWorkbench } from '../../core/useWorkbench';
import { MEGABYTE, readTextFile } from '../shared/readTextFile';

export type SlotId = 'baseline' | 'canary';
export type SlotSource = 'paste' | 'file' | 'workbench';
export type SlotError = 'tooBig' | 'unreadable' | 'noLoadedLog';

export interface Slot {
  text: string;
  source: SlotSource;
  /** The file name, for a slot filled from a file. */
  name: string | null;
}

export type Slots = Record<SlotId, Slot>;

export const MAX_DIFF_FILE_MEGABYTES = 20;

const EMPTY_SLOT: Slot = { text: '', source: 'paste', name: null };
const EMPTY_SLOTS: Slots = { baseline: EMPTY_SLOT, canary: EMPTY_SLOT };

/** The two logs being compared, and the ways to fill each one. Every change makes a new `slots`. */
export function useDiffSlots() {
  const { rawLog } = useWorkbench();
  const [slots, setSlots] = useState<Slots>(EMPTY_SLOTS);
  const [errors, setErrors] = useState<Partial<Record<SlotId, SlotError>>>({});

  function fill(id: SlotId, slot: Slot, error?: SlotError) {
    setSlots((current) => ({ ...current, [id]: slot }));
    setErrors((current) => ({ ...current, [id]: error }));
  }

  function paste(id: SlotId, text: string) {
    fill(id, { text, source: 'paste', name: null });
  }

  function clear(id: SlotId) {
    fill(id, EMPTY_SLOT);
  }

  function fillFromWorkbench(id: SlotId) {
    if (rawLog.trim() === '') {
      return setErrors((current) => ({ ...current, [id]: 'noLoadedLog' }));
    }
    fill(id, { text: rawLog, source: 'workbench', name: null });
  }

  async function openFile(id: SlotId, file: File) {
    const result = await readTextFile(file, MAX_DIFF_FILE_MEGABYTES * MEGABYTE);
    if (!result.ok) {
      return setErrors((current) => ({ ...current, [id]: result.reason }));
    }
    fill(id, { text: result.text, source: 'file', name: file.name });
  }

  return { slots, errors, paste, clear, fillFromWorkbench, openFile };
}
