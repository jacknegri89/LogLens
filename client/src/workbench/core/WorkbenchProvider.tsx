import { useCallback, useState, type ReactNode } from 'react';

import { useAnalysis } from '../../hooks/useAnalysis';
import type { AnalysisRecord } from '../../lib/types';
import type { TimeMode, WorkbenchTabId } from '../types';
import { useParsedLines } from './useParsedLines';
import { WorkbenchContext, type WorkbenchState } from './WorkbenchContext';

function toggled(current: ReadonlySet<number>, index: number): ReadonlySet<number> {
  const next = new Set(current);
  if (!next.delete(index)) next.add(index);
  return next;
}

/** Keeps the loaded log for the whole visit, so it survives moving between pages. */
export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [rawLog, setRawLog] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedIndex, select] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<ReadonlySet<number>>(new Set());
  const [timeMode, setTimeMode] = useState<TimeMode>('utc');
  const [activeTab, setActiveTab] = useState<WorkbenchTabId>('explorer');
  const analysis = useAnalysis();
  const [restored, setRestored] = useState<AnalysisRecord | null>(null);

  const { lines, parsing } = useParsedLines(rawLog);
  const setLog = useCallback((text: string, name: string | null = null) => {
    setRawLog(text);
    setFileName(name);
    select(null);
    setBookmarks(new Set());
  }, []);
  const appendLog = useCallback((text: string) => {
    setRawLog((current) => (current === '' ? text : `${current}\n${text}`));
  }, []);
  const loadAnalysis = useCallback(
    (record: AnalysisRecord | null) => {
      analysis.reset();
      setRestored(record);
    },
    [analysis],
  );
  const analyze = useCallback(() => {
    if (rawLog.trim() !== '') {
      setRestored(null);
      analysis.run({
        rawLog,
        source: fileName ? 'upload' : 'paste',
        fileName: fileName ?? undefined,
      });
    }
  }, [analysis, rawLog, fileName]);

  const value: WorkbenchState = {
    rawLog,
    fileName,
    lines,
    parsing,
    setLog,
    appendLog,
    selectedIndex,
    select,
    bookmarks,
    toggleBookmark: (index) => setBookmarks((current) => toggled(current, index)),
    timeMode,
    setTimeMode,
    activeTab,
    setActiveTab,
    analysis: {
      status: analysis.status,
      error: analysis.error,
      record: analysis.result ?? restored,
    },
    analyze,
    loadAnalysis,
  };
  return <WorkbenchContext value={value}>{children}</WorkbenchContext>;
}
