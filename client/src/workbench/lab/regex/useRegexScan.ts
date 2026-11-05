import { useEffect, useState } from 'react';

import type { ParsedLine } from '../../types';
import type { RegexBuild } from './regexBuild';
import type { ScanSnapshot } from './regexScan';

/** A short pause while typing, so each keystroke does not restart the search. */
const START_DELAY_MS = 120;
const WORKER_TIMEOUT_MS = 2000;

interface ScanProgress {
  build: RegexBuild;
  lines: ParsedLine[];
  snapshot: ScanSnapshot | null;
  failed: boolean;
}

/**
 * Searches the log in slices so a heavy pattern cannot freeze the page. The result belongs to
 * the pattern and lines it was made for, and is hidden as soon as either changes.
 */
export function useRegexScan(lines: ParsedLine[], build: RegexBuild) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);

  useEffect(() => {
    if (build.status !== 'ready') {
      return;
    }
    let worker: Worker | null = null;
    let watchdog = 0;
    const fail = () => {
      worker?.terminate();
      window.clearTimeout(watchdog);
      setProgress({ build, lines, snapshot: null, failed: true });
    };
    const timer = window.setTimeout(() => {
      try {
        worker = new Worker(new URL('./regexWorker.ts', import.meta.url), { type: 'module' });
        worker.onerror = fail;
        worker.onmessage = (event: MessageEvent<ScanSnapshot>) => {
          window.clearTimeout(watchdog);
          setProgress({ build, lines, snapshot: event.data, failed: false });
          if (event.data.done) {
            worker?.terminate();
          } else {
            watchdog = window.setTimeout(fail, WORKER_TIMEOUT_MS);
          }
        };
        watchdog = window.setTimeout(fail, WORKER_TIMEOUT_MS);
        worker.postMessage({
          lines,
          source: build.regex.source,
          flags: build.regex.flags,
          firstMatchOnly: build.firstMatchOnly,
        });
      } catch {
        fail();
      }
    }, START_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(watchdog);
      worker?.terminate();
    };
  }, [lines, build]);

  const current = progress?.build === build && progress.lines === lines;
  if (current) {
    return { snapshot: progress.snapshot, failed: progress.failed };
  }
  return { snapshot: null, failed: false };
}
