import { isFailure } from './format';

/** At most this many lines light up while the log is being read. */
const MAX_SCAN_ROWS = 8;
const DEFAULT_ROW_HEIGHT = 22;

export interface ScanRow {
  top: number;
  height: number;
}

/**
 * Lines that look like failures, with their position in the editor. They light up
 * while the server reads the log; the real marks come with the report.
 */
export function scanRows(text: string, rowHeights: number[]): ScanRow[] {
  const rows: ScanRow[] = [];
  let top = 0;
  const lines = text.split('\n');
  for (let index = 0; index < lines.length && rows.length < MAX_SCAN_ROWS; index++) {
    const height = rowHeights[index] ?? DEFAULT_ROW_HEIGHT;
    if (isFailure(lines[index])) {
      rows.push({ top, height });
    }
    top += height;
  }
  return rows;
}
