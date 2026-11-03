import type { Severity } from './types';

/** Ink colours for each severity, readable on the cream paper. */
export const severityColors: Record<Severity, { text: string; border: string }> = {
  critical: { text: 'text-pen', border: 'border-pen' },
  high: { text: 'text-pen', border: 'border-pen' },
  medium: { text: 'text-amber', border: 'border-amber' },
  low: { text: 'text-blueink', border: 'border-blueink' },
  informational: { text: 'text-blueink', border: 'border-blueink' },
};

/** Whether a log line is a failure, so the report can mark it with the highlighter. */
export function isFailure(line: string): boolean {
  return /error|exception|fatal|fail|refused|killed/i.test(line);
}

/**
 * Finds the line number (1-based) of each key line inside the original log,
 * so the report can point back at the log. Lines that cannot be found are skipped.
 */
export function findLineNumbers(rawLog: string, keyLines: string[]): Map<string, number> {
  const logLines = rawLog.split('\n').map((line) => line.trim());
  const found = new Map<string, number>();
  for (const keyLine of keyLines) {
    const index = logLines.indexOf(keyLine.trim());
    if (index !== -1) {
      found.set(keyLine, index + 1);
    }
  }
  return found;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** The public address of a shared report. */
export function shareUrl(token: string): string {
  return `${window.location.origin}/shared/${token}`;
}

/** Trigger a client-side download of a Markdown file. */
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** The editor always shows at least this many rows, so it looks like a sheet. */
export const MIN_EDITOR_ROWS = 20;

/** Rows the editor shows for this text: at least the minimum, so the sheet looks full. */
export function editorRows(text: string): number {
  return Math.max(countLines(text), MIN_EDITOR_ROWS);
}

/** Number of lines in the editor; an empty text has none. */
export function countLines(text: string): number {
  return text === '' ? 0 : text.split('\n').length;
}
