import type { AnalysisRecord, AnalysisSummary } from './types';

const STORAGE_KEY = 'loglens-local-history';

export const MAX_LOCAL_ANALYSES = 30;
export const MAX_LOCAL_LOG_CHARACTERS = 20_000;
// Browsers give about 5 million characters to one site; staying near 3 million leaves room
// for the visitor id and for anything else the page stores.
export const MAX_LOCAL_TOTAL_CHARACTERS = 3_000_000;

function isStoredRecord(value: unknown): value is AnalysisRecord {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AnalysisRecord>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.rawLog === 'string' &&
    typeof candidate.report === 'object' &&
    candidate.report !== null
  );
}

/** The saved analyses, newest first; empty when nothing is saved, storage is blocked or the data is damaged. */
function readAll(): AnalysisRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(isStoredRecord) : [];
  } catch {
    return [];
  }
}

/** Keeps the newest analyses that fit the count and the size limits; the oldest are dropped. */
function withinLimits(records: AnalysisRecord[]): AnalysisRecord[] {
  const kept: AnalysisRecord[] = [];
  let totalCharacters = 0;
  for (const record of records.slice(0, MAX_LOCAL_ANALYSES)) {
    totalCharacters += JSON.stringify(record).length;
    if (totalCharacters > MAX_LOCAL_TOTAL_CHARACTERS) break;
    kept.push(record);
  }
  return kept;
}

function tryWrite(records: AnalysisRecord[]): boolean {
  try {
    if (records.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

/** Writes the list; when the storage is full it retries with fewer analyses, oldest dropped first. */
function persist(records: AnalysisRecord[]): void {
  const candidates = withinLimits(records);
  if (candidates.length === 0) {
    tryWrite([]);
    return;
  }
  for (let count = candidates.length; count > 0; count -= 1) {
    if (tryWrite(candidates.slice(0, count))) return;
  }
}

function truncateLog(record: AnalysisRecord): AnalysisRecord {
  if (record.rawLog.length <= MAX_LOCAL_LOG_CHARACTERS) return record;
  return {
    ...record,
    rawLog: record.rawLog.slice(0, MAX_LOCAL_LOG_CHARACTERS),
    logTruncated: true,
  };
}

/** Keeps a copy of a finished analysis in this browser; the log is cut at the limit and flagged. */
export function saveLocalAnalysis(record: AnalysisRecord): void {
  const others = readAll().filter((saved) => saved.id !== record.id);
  persist([truncateLog(record), ...others]);
}

/** The copies kept in this browser as history rows, newest first. */
export function listLocalAnalyses(): AnalysisSummary[] {
  return readAll().map(({ id, createdAt, source, title, severity, category }) => ({
    id,
    createdAt,
    source,
    title,
    severity,
    category,
  }));
}

export function getLocalAnalysis(id: string): AnalysisRecord | null {
  return readAll().find((saved) => saved.id === id) ?? null;
}

export function removeLocalAnalysis(id: string): void {
  persist(readAll().filter((saved) => saved.id !== id));
}

export function clearLocalAnalyses(): void {
  tryWrite([]);
}
