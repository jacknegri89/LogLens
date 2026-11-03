import { useState } from 'react';

const STORAGE_KEY = 'loglens.anonymize';

function readPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writePreference(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Storage can be blocked (private window); the choice then lasts until the page closes.
  }
}

/** The "Anonymize before sending" choice, remembered between visits. */
export function useAnonymize() {
  const [enabled, setEnabled] = useState(readPreference);

  function change(next: boolean) {
    setEnabled(next);
    writePreference(next);
  }

  return { enabled, change };
}
