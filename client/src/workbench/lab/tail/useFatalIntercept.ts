import { useEffect, useEffectEvent } from 'react';

import { useWorkbench } from '../../core/useWorkbench';

/**
 * Watches the loaded log for the stream's FATAL line. When it appears, the log is analyzed and
 * Insights opens, once. Returns the number of the intercepted line (1-based), or null.
 */
export function useFatalIntercept(expectedFatalLine: string | null): number | null {
  const { lines, analyze, setActiveTab } = useWorkbench();
  const last = lines[lines.length - 1];
  const intercepted =
    expectedFatalLine !== null && last?.level === 'FATAL' && last.raw === expectedFatalLine;
  let fatalLineNumber: number | null = null;
  if (intercepted) {
    fatalLineNumber = last.index + 1;
  }

  // An effect event reads the newest `analyze`, which holds the log with the fatal line in it.
  const analyzeAndOpenInsights = useEffectEvent(() => {
    analyze();
    setActiveTab('insights');
  });
  useEffect(() => {
    if (fatalLineNumber !== null) {
      analyzeAndOpenInsights();
    }
  }, [fatalLineNumber]);

  return fatalLineNumber;
}
