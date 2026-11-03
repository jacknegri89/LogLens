const STORAGE_KEY = 'loglens-theme';
const CONTRAST = 'contrast';

/** Whether the visitor chose high contrast before; false when nothing is saved or storage is blocked. */
export function isContrastStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === CONTRAST;
  } catch {
    return false;
  }
}

export function isContrastActive(): boolean {
  return document.documentElement.dataset.theme === CONTRAST;
}

/** Turns high contrast on or off on the page and remembers the choice. */
export function setContrastTheme(enabled: boolean): void {
  if (enabled) document.documentElement.dataset.theme = CONTRAST;
  else delete document.documentElement.dataset.theme;
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, CONTRAST);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked; the choice then lasts until the page closes.
  }
}

/** Applies the saved choice when the page opens. */
export function applyStoredTheme(): void {
  if (isContrastStored()) document.documentElement.dataset.theme = CONTRAST;
}
