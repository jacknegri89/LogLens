import { useEffect, useState } from 'react';

const STORAGE_KEY = 'loglens.calm';

function readPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writePreference(calm: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(calm));
  } catch {
    // Storage can be blocked; the choice then lasts until the page closes.
  }
}

/**
 * "Calm mode": every animation is switched off, for a quieter page and a lighter one to draw. The
 * choice is saved, and the page reads it through `data-calm` on the root element (see pages.css).
 */
export function useCalmMode() {
  const [calm, setCalm] = useState(readPreference);

  useEffect(() => {
    document.documentElement.dataset.calm = String(calm);
    writePreference(calm);
  }, [calm]);

  return { calm, toggle: () => setCalm((current) => !current) };
}
