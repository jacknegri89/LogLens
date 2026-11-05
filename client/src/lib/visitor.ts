const STORAGE_KEY = 'loglens-visitor-id';

// Used only when the browser blocks storage: the id then lasts until the page closes.
let fallbackId: string | null = null;

/**
 * A random id kept in this browser. The server uses it to show each visitor only
 * their own history.
 */
export function getVisitorId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return stored;
    }
    const created = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    fallbackId = fallbackId ?? crypto.randomUUID();
    return fallbackId;
  }
}
