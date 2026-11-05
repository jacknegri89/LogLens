/** Whole-number percentage of the steps that are done (0 when there are no steps). */
export function completedPercent(doneCount: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((Math.min(Math.max(doneCount, 0), total) / total) * 100);
}

/** A new set with the step added, or removed when it was already there. */
export function toggledStep(done: ReadonlySet<number>, index: number): ReadonlySet<number> {
  const next = new Set(done);
  if (!next.delete(index)) {
    next.add(index);
  }
  return next;
}

const STORAGE_PREFIX = 'loglens.runbook.';

/** The browser's local storage, or null when it is blocked (private window, disabled cookies). */
export function browserStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type RunbookStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;

function keepValidSteps(value: unknown, total: number): Set<number> {
  if (!Array.isArray(value)) {
    return new Set();
  }
  const valid = value.filter(
    (entry): entry is number => Number.isInteger(entry) && entry >= 0 && entry < total,
  );
  return new Set(valid);
}

/** The steps saved for the analysis; anything missing, broken or out of range is dropped. */
export function loadDoneSteps(
  storage: RunbookStorage,
  analysisId: string,
  total: number,
): ReadonlySet<number> {
  try {
    const saved = storage?.getItem(STORAGE_PREFIX + analysisId);
    if (saved) {
      return keepValidSteps(JSON.parse(saved), total);
    }
    return new Set();
  } catch {
    return new Set();
  }
}

/** Saves the done steps; an empty set removes the entry. Returns false when storage refused. */
export function saveDoneSteps(
  storage: RunbookStorage,
  analysisId: string,
  done: ReadonlySet<number>,
): boolean {
  try {
    if (!storage) {
      return false;
    }
    const key = STORAGE_PREFIX + analysisId;
    if (done.size === 0) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify([...done].sort((a, b) => a - b)));
    }
    return true;
  } catch {
    return false;
  }
}
