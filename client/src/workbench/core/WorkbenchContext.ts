import { createContext } from 'react';

import type { AnalysisStatus } from '../../hooks/useAnalysis';
import type { AnalysisRecord } from '../../lib/types';
import type { ParsedLine, TimeMode, WorkbenchTabId } from '../types';

export interface WorkbenchAnalysis {
  status: AnalysisStatus;
  error: string;
  /** The server's report for the loaded log, or null before the first analysis. */
  record: AnalysisRecord | null;
}

/** What every Workbench view shares: the loaded log, the selected line and the last analysis. */
export interface WorkbenchState {
  rawLog: string;
  fileName: string | null;
  lines: ParsedLine[];
  /**
   * True while a long log is parsed in the background. Meanwhile `lines` keeps the lines read
   * before when the log only grew (live tail), and is empty otherwise.
   */
  parsing: boolean;
  /** Replaces the loaded log (an empty text clears it). */
  setLog: (text: string, fileName?: string | null) => void;
  /** Adds text to the end of the loaded log (live tail). */
  appendLog: (text: string) => void;
  /** The `index` of the selected ParsedLine, or null. */
  selectedIndex: number | null;
  select: (index: number | null) => void;
  bookmarks: ReadonlySet<number>;
  toggleBookmark: (index: number) => void;
  timeMode: TimeMode;
  setTimeMode: (mode: TimeMode) => void;
  activeTab: WorkbenchTabId;
  setActiveTab: (tab: WorkbenchTabId) => void;
  analysis: WorkbenchAnalysis;
  /** Sends the loaded log to the server for analysis. */
  analyze: () => void;
  /** Shows a report that was restored (for example from a share link) without asking the server; null clears it. */
  loadAnalysis: (record: AnalysisRecord | null) => void;
}

export const WorkbenchContext = createContext<WorkbenchState | null>(null);
