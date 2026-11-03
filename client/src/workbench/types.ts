export type LogLevel = 'FATAL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';

/** One line of the loaded log, read once so every view works on the same facts. */
export interface ParsedLine {
  /** 0-based position in the log. */
  index: number;
  raw: string;
  /** Epoch milliseconds, or null when the line has no readable time. */
  timestamp: number | null;
  level: LogLevel | null;
  service: string | null;
  /** The line without its time and level prefix. */
  message: string;
  /** key=value pairs and flattened JSON fields, keys lower-cased (trace_id, status, user...). */
  fields: Record<string, string>;
  latencyMs: number | null;
  /** An error, fatal, exception or stack frame line. */
  isFault: boolean;
}

export type TimeMode = 'utc' | 'local' | 'relative';

export const WORKBENCH_TAB_IDS = [
  'explorer',
  'clusters',
  'traces',
  'lab',
  'security',
  'insights',
  'fix',
  'ask',
  'export',
] as const;

export type WorkbenchTabId = (typeof WORKBENCH_TAB_IDS)[number];
