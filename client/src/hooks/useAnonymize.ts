import { useState } from 'react';

const STORAGE_KEY = 'loglens.anonymize';
let sessionPreference = false;

export function readAnonymizePreference(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return sessionPreference || stored === 'true';
  } catch {
    return sessionPreference;
  }
}

function writePreference(enabled: boolean) {
  sessionPreference = enabled;
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Storage can be blocked (private window); the choice then lasts until the page closes.
  }
}

/** The "Anonymize before sending" choice, remembered between visits. */
export function useAnonymize() {
  const [enabled, setEnabled] = useState(readAnonymizePreference);

  function change(next: boolean) {
    setEnabled(next);
    writePreference(next);
  }

  return { enabled, change };
}
