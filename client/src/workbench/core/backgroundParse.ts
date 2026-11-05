import type { ParsedLine } from '../types';
import { parseLines } from './basicParse';

/** Logs with fewer lines than this parse at once on the main thread: a worker would cost more. */
export const SYNC_LINE_LIMIT = 2000;
export const SYNC_CHARACTER_LIMIT = 100_000;

/** True when the log has fewer lines than `limit`; it stops counting at the limit. */
export function isSmallLog(text: string, limit = SYNC_LINE_LIMIT): boolean {
  if (text.length > SYNC_CHARACTER_LIMIT) {
    return false;
  }
  let count = 1;
  let position = text.indexOf('\n');
  while (position !== -1) {
    count += 1;
    if (count >= limit) {
      return false;
    }
    position = text.indexOf('\n', position + 1);
  }
  return true;
}

function startWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }
  try {
    return new Worker(new URL('./parse.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    return null;
  }
}

function parseOnMainThread(text: string, finish: (lines: ParsedLine[]) => void): () => void {
  const timer = setTimeout(() => finish(parseLines(text)), 0);
  return () => clearTimeout(timer);
}

function parseInWorker(worker: Worker, text: string, finish: (lines: ParsedLine[]) => void) {
  const fallBack = (event: Event) => {
    event.preventDefault();
    worker.terminate();
    finish(parseLines(text));
  };
  worker.onmessage = (event: MessageEvent<ParsedLine[]>) => {
    worker.terminate();
    finish(event.data);
  };
  worker.onerror = fallBack;
  worker.onmessageerror = fallBack;
  worker.postMessage(text);
  return () => worker.terminate();
}

/**
 * Parses a log off the main thread and calls `onDone` once with its lines. Without a working
 * worker it parses on the main thread instead. The returned function cancels: `onDone` is then
 * never called, so a log that changed meanwhile never receives stale lines.
 */
export function parseInBackground(text: string, onDone: (lines: ParsedLine[]) => void): () => void {
  let cancelled = false;
  const finish = (lines: ParsedLine[]) => {
    if (!cancelled) {
      onDone(lines);
    }
  };
  const worker = startWorker();
  let stop: () => void;
  if (worker) {
    stop = parseInWorker(worker, text, finish);
  } else {
    stop = parseOnMainThread(text, finish);
  }
  return () => {
    cancelled = true;
    stop();
  };
}
