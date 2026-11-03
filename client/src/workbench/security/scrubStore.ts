/** What the last sanitize did, kept outside React so the toolbar button and the command palette share it. */
export interface ScrubSnapshot {
  before: string;
  beforeName: string | null;
  after: string;
  /** Places replaced; 0 means the log had nothing sensitive. */
  occurrences: number;
}

let current: ScrubSnapshot | null = null;
const listeners = new Set<() => void>();

export function readScrub(): ScrubSnapshot | null {
  return current;
}

export function writeScrub(next: ScrubSnapshot | null): void {
  current = next;
  listeners.forEach((listener) => listener());
}

export function subscribeScrub(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
