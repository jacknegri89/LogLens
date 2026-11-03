import { useEffect, useState } from 'react';

import type { ParsedLine } from '../../types';
import type { RegexBuild } from './regexBuild';
import { advanceScan, createScan, isScanDone, readScan, type ScanSnapshot } from './regexScan';

/** How long one slice may hold the page before it lets go. */
const SLICE_BUDGET_MS = 40;
/** A short pause while typing, so each keystroke does not restart the search. */
const START_DELAY_MS = 120;

interface ScanProgress {
  build: RegexBuild;
  lines: ParsedLine[];
  snapshot: ScanSnapshot;
}

/**
 * Searches the log in slices so a heavy pattern cannot freeze the page. The result belongs to
 * the pattern and lines it was made for, and is hidden as soon as either changes.
 */
export function useRegexScan(lines: ParsedLine[], build: RegexBuild): ScanSnapshot | null {
  const [progress, setProgress] = useState<ScanProgress | null>(null);

  useEffect(() => {
    if (build.status !== 'ready') return;
    const scan = createScan(lines, build.regex, build.firstMatchOnly);
    let timer = 0;
    const runSlice = () => {
      advanceScan(scan, SLICE_BUDGET_MS);
      setProgress({ build, lines, snapshot: readScan(scan) });
      if (!isScanDone(scan)) timer = window.setTimeout(runSlice, 0);
    };
    timer = window.setTimeout(runSlice, START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [lines, build]);

  const current = progress?.build === build && progress.lines === lines;
  return current ? progress.snapshot : null;
}
