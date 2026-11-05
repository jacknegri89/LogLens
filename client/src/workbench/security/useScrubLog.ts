import { useCallback, useSyncExternalStore } from 'react';

import { anonymizeLog } from '../../lib/anonymize';
import { useWorkbench } from '../core/useWorkbench';
import { readScrub, subscribeScrub, writeScrub, type ScrubSnapshot } from './scrubStore';

export interface ScrubControls {
  /** Sanitizes the loaded log in place. */
  scrub: () => void;
  /** Puts the log back as it was before the last sanitize. */
  undo: () => void;
  canScrub: boolean;
  /** The last sanitize, while the loaded log is still its result; otherwise null. */
  result: ScrubSnapshot | null;
}

/** One-click sanitizing of the loaded log, with undo. Used by the toolbar button and the palette. */
export function useScrubLog(): ScrubControls {
  const { rawLog, fileName, setLog } = useWorkbench();
  const snapshot = useSyncExternalStore(subscribeScrub, readScrub);

  const scrub = useCallback(() => {
    const { text, occurrences } = anonymizeLog(rawLog);
    if (occurrences > 0) {
      setLog(text, fileName);
    }
    writeScrub({ before: rawLog, beforeName: fileName, after: text, occurrences });
  }, [rawLog, fileName, setLog]);

  const undo = useCallback(() => {
    if (!snapshot) {
      return;
    }
    setLog(snapshot.before, snapshot.beforeName);
    writeScrub(null);
  }, [snapshot, setLog]);

  let result: ScrubSnapshot | null = null;
  if (snapshot && snapshot.after === rawLog) {
    result = snapshot;
  }
  return { scrub, undo, canScrub: rawLog.trim() !== '', result };
}
